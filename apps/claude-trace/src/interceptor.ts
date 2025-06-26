import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { RawPair, StreamingDetails, ParsedChunk } from "./types";
import { HTMLGenerator } from "./html-generator";
import { ZeroLatencyInterceptor } from "./zero-latency-interceptor";

export interface InterceptorConfig {
	logDirectory?: string;
	enableRealTimeHTML?: boolean;
	logLevel?: "debug" | "info" | "warn" | "error";
	maxLogSize?: number; // bytes, default 3MB
	zeroLatency?: {
		enabled: boolean;
		backgroundWorkers?: number;
		writeBufferSize?: number;
		writeBufferFlushMs?: number;
		deferredParsing?: boolean;
		memoryPoolSize?: number;
	};
}

export class ClaudeTrafficLogger {
	private logDir: string;
	private logFile: string;
	private htmlFile: string;
	private pendingRequests: Map<string, any> = new Map();
	private pairs: RawPair[] = [];
	private config: InterceptorConfig;
	private htmlGenerator: HTMLGenerator;
	private zeroLatencyInterceptor?: ZeroLatencyInterceptor;

	constructor(config: InterceptorConfig = {}) {
		this.config = {
			logDirectory: ".claude-trace",
			enableRealTimeHTML: false,
			logLevel: "info",
			maxLogSize: 3 * 1024 * 1024, // 3MB
			...config,
		};

		// Create log directory if it doesn't exist
		this.logDir = this.config.logDirectory!;
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}

		// Generate timestamped filenames
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, -5); // Remove milliseconds and Z

		this.logFile = path.join(this.logDir, `log-${timestamp}.jsonl`);
		this.htmlFile = path.join(this.logDir, `log-${timestamp}.html`);

		// Initialize HTML generator
		this.htmlGenerator = new HTMLGenerator();

		// Initialize zero-latency interceptor if enabled
		if (this.config.zeroLatency?.enabled) {
			this.zeroLatencyInterceptor = new ZeroLatencyInterceptor(this.logFile, this.config.zeroLatency);
		}

		// Clear log file
		fs.writeFileSync(this.logFile, "");
	}

	private isAnthropicAPI(url: string | URL): boolean {
		const urlString = typeof url === "string" ? url : url.toString();
		const includeAllRequests = process.env.CLAUDE_TRACE_INCLUDE_ALL_REQUESTS === "true";

		// Support custom ANTHROPIC_BASE_URL
      		const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
      		const apiHost = new URL(baseUrl).hostname;
		
		if (includeAllRequests) {
			return urlString.includes(apiHost); // Capture all Anthropic API requests
		}

		return urlString.includes(apiHost) && urlString.includes("/v1/messages");
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	private redactSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
		const redactedHeaders = { ...headers };
		const sensitiveKeys = [
			"authorization",
			"x-api-key",
			"x-auth-token",
			"cookie",
			"set-cookie",
			"x-session-token",
			"x-access-token",
			"bearer",
			"proxy-authorization",
		];

		for (const key of Object.keys(redactedHeaders)) {
			const lowerKey = key.toLowerCase();
			if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
				// Keep first 10 chars and last 4 chars, redact middle
				const value = redactedHeaders[key];
				if (value && value.length > 14) {
					redactedHeaders[key] = `${value.substring(0, 10)}...${value.slice(-4)}`;
				} else if (value && value.length > 4) {
					redactedHeaders[key] = `${value.substring(0, 2)}...${value.slice(-2)}`;
				} else {
					redactedHeaders[key] = "[REDACTED]";
				}
			}
		}

		return redactedHeaders;
	}

	private async cloneResponse(response: Response): Promise<Response> {
		// Clone the response to avoid consuming the body
		return response.clone();
	}

	private async parseRequestBody(body: any): Promise<any> {
		if (!body) return null;

		if (typeof body === "string") {
			try {
				return JSON.parse(body);
			} catch {
				return body;
			}
		}

		if (body instanceof FormData) {
			const formObject: Record<string, any> = {};
			for (const [key, value] of body.entries()) {
				formObject[key] = value;
			}
			return formObject;
		}

		return body;
	}

	private async parseResponseBody(
		response: Response,
	): Promise<{ body?: any; body_raw?: string; streaming_details?: StreamingDetails }> {
		const contentType = response.headers.get("content-type") || "";

		try {
			if (contentType.includes("application/json")) {
				const body = await response.json();
				return { body };
			} else if (contentType.includes("text/event-stream")) {
				// For JSONL logging, only return body_raw to avoid duplication
				const streamingResult = await this.handleStreamingResponse(response);
				return { body_raw: streamingResult.body_raw };
			} else if (contentType.includes("text/")) {
				const body_raw = await response.text();
				return { body_raw };
			} else {
				// For other types, try to read as text
				const body_raw = await response.text();
				return { body_raw };
			}
		} catch (error) {
			// Silent error handling during runtime
			return {};
		}
	}

	private async handleStreamingResponse(
		response: Response,
	): Promise<{ body_raw: string; streaming_details: StreamingDetails }> {
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		let fullContent = "";
		const chunks: ParsedChunk[] = [];
		const startTime = Date.now() / 1000;

		if (!reader) {
			// No reader available, return empty streaming details
			return {
				body_raw: "",
				streaming_details: this.buildStreamingDetails([], startTime),
			};
		}

		try {
			let sequence = 1;
			while (true) {
				try {
					const { done, value } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					fullContent += chunk;

					// Parse and accumulate chunk details (filtering ping events)
					const parsedChunks = this.parseChunkData(chunk, sequence, startTime);
					chunks.push(...parsedChunks);
					sequence += parsedChunks.length;
				} catch (readError) {
					// Handle individual read errors
					const timestamp = Date.now() / 1000;
					chunks.push({
						sequence: sequence++,
						timestamp,
						event_type: "read_error",
						data: {
							error: "Stream read failed",
							errorMessage: readError instanceof Error ? readError.message : "Unknown read error",
						},
						chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
					});
					break; // Exit on read error
				}
			}
		} catch (streamError) {
			// Handle overall streaming errors
			const timestamp = Date.now() / 1000;
			chunks.push({
				sequence: 1,
				timestamp,
				event_type: "stream_error",
				data: {
					error: "Stream processing failed",
					errorMessage: streamError instanceof Error ? streamError.message : "Unknown stream error",
				},
				chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
			});
		} finally {
			try {
				reader.releaseLock();
			} catch (releaseError) {
				// Ignore release errors, they're not critical
			}
		}

		// Build streaming details
		const streaming_details = this.buildStreamingDetails(chunks, startTime);

		return { body_raw: fullContent, streaming_details };
	}

	private isPingEvent(eventData: string): boolean {
		return eventData.includes('event: ping\ndata: {"type": "ping"}');
	}

	private parseChunkData(chunkData: string, startSequence: number, startTime: number): ParsedChunk[] {
		// Split chunk data into individual SSE events
		const events: ParsedChunk[] = [];

		try {
			const lines = chunkData.split("\n");
			let currentEvent: { event?: string; data?: string } = {};
			let sequence = startSequence;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();

				if (line.startsWith("event: ")) {
					currentEvent.event = line.replace("event: ", "").trim();
				} else if (line.startsWith("data: ")) {
					currentEvent.data = line.replace("data: ", "").trim();
				} else if (line === "" && currentEvent.event && currentEvent.data) {
					// End of an SSE event
					const eventStr = `event: ${currentEvent.event}\ndata: ${currentEvent.data}\n\n`;

					// Filter out ping events
					if (!this.isPingEvent(eventStr)) {
						try {
							const data = JSON.parse(currentEvent.data);
							const timestamp = Date.now() / 1000;

							events.push({
								sequence: sequence++,
								timestamp,
								event_type: currentEvent.event,
								data,
								chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
							});
						} catch (error) {
							// Handle malformed JSON gracefully
							const timestamp = Date.now() / 1000;
							events.push({
								sequence: sequence++,
								timestamp,
								event_type: currentEvent.event || "unknown",
								data: {
									raw: currentEvent.data,
									error: "Invalid JSON",
									errorMessage: error instanceof Error ? error.message : "Unknown error",
								},
								chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
							});
						}
					}

					currentEvent = {};
				}
			}

			// Handle incomplete event at end of chunk
			if (currentEvent.event && currentEvent.data) {
				const eventStr = `event: ${currentEvent.event}\ndata: ${currentEvent.data}\n\n`;
				if (!this.isPingEvent(eventStr)) {
					try {
						const data = JSON.parse(currentEvent.data);
						const timestamp = Date.now() / 1000;

						events.push({
							sequence: sequence++,
							timestamp,
							event_type: currentEvent.event,
							data,
							chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
						});
					} catch (error) {
						const timestamp = Date.now() / 1000;
						events.push({
							sequence: sequence++,
							timestamp,
							event_type: currentEvent.event || "unknown",
							data: {
								raw: currentEvent.data,
								error: "Invalid JSON",
								errorMessage: error instanceof Error ? error.message : "Unknown error",
							},
							chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
						});
					}
				}
			}
		} catch (error) {
			// If parsing completely fails, create an error event
			const timestamp = Date.now() / 1000;
			events.push({
				sequence: startSequence,
				timestamp,
				event_type: "parse_error",
				data: {
					raw: chunkData,
					error: "Chunk parsing failed",
					errorMessage: error instanceof Error ? error.message : "Unknown error",
				},
				chunk_timing_ms: Math.round((timestamp - startTime) * 1000),
			});
		}

		return events;
	}

	private buildStreamingDetails(chunks: ParsedChunk[], startTime: number): StreamingDetails {
		if (chunks.length === 0) {
			return {
				chunk_count: 0,
				first_chunk_timestamp: startTime,
				last_chunk_timestamp: startTime,
				total_duration_ms: 0,
				chunks: [],
			};
		}

		const firstTimestamp = chunks[0].timestamp;
		const lastTimestamp = chunks[chunks.length - 1].timestamp;

		return {
			chunk_count: chunks.length,
			first_chunk_timestamp: firstTimestamp,
			last_chunk_timestamp: lastTimestamp,
			total_duration_ms: Math.round((lastTimestamp - firstTimestamp) * 1000),
			chunks,
		};
	}

	public instrumentAll(): void {
		this.instrumentFetch();
		this.instrumentNodeHTTP();
	}

	public instrumentFetch(): void {
		if (!global.fetch) {
			// Silent - fetch not available
			return;
		}

		// Check if already instrumented by checking for our marker
		if ((global.fetch as any).__claudeTraceInstrumented) {
			return;
		}

		const originalFetch = global.fetch;
		const logger = this;

		global.fetch = async function (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
			// Convert input to URL for consistency
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

			// Only intercept Anthropic API calls
			if (!logger.isAnthropicAPI(url)) {
				return originalFetch(input, init);
			}

			const requestId = logger.generateRequestId();
			const requestTimestamp = Date.now();

			// Capture request details
			const requestData = {
				timestamp: requestTimestamp / 1000, // Convert to seconds (like Python version)
				method: init.method || "GET",
				url: url,
				headers: logger.redactSensitiveHeaders(Object.fromEntries(new Headers(init.headers || {}).entries())),
				body: await logger.parseRequestBody(init.body),
			};

			// Store pending request
			logger.pendingRequests.set(requestId, requestData);

			try {
				// Make the actual request
				const response = await originalFetch(input, init);
				const responseTimestamp = Date.now();

				// Use zero-latency interceptor if enabled
				if (logger.zeroLatencyInterceptor) {
					const isStreaming = response.headers.get("content-type")?.includes("text/event-stream");

					if (isStreaming) {
						return await logger.zeroLatencyInterceptor.interceptStreamingResponse(
							response,
							requestData,
							requestId,
						);
					} else {
						return await logger.zeroLatencyInterceptor.interceptNonStreamingResponse(
							response,
							requestData,
							requestId,
						);
					}
				}

				// Fallback to standard processing
				// Clone response to avoid consuming the body
				const clonedResponse = await logger.cloneResponse(response);

				// Parse response body
				const responseBodyData = await logger.parseResponseBody(clonedResponse);

				// Create response data
				const responseData = {
					timestamp: responseTimestamp / 1000,
					status_code: response.status,
					headers: logger.redactSensitiveHeaders(Object.fromEntries(response.headers.entries())),
					...responseBodyData,
				};

				// Create paired request-response object
				const pair: RawPair = {
					request: requestData,
					response: responseData,
					logged_at: new Date().toISOString(),
				};

				// Remove from pending and add to pairs
				logger.pendingRequests.delete(requestId);
				logger.pairs.push(pair);

				// Write to log file
				await logger.writePairToLog(pair);

				// Generate HTML if enabled
				if (logger.config.enableRealTimeHTML) {
					await logger.generateHTML();
				}

				return response;
			} catch (error) {
				// Remove from pending requests on error
				logger.pendingRequests.delete(requestId);
				throw error;
			}
		};

		// Mark fetch as instrumented
		(global.fetch as any).__claudeTraceInstrumented = true;

		// Silent initialization
	}

	public instrumentNodeHTTP(): void {
		try {
			const http = require("http");
			const https = require("https");
			const logger = this;

			// Instrument http.request
			if (http.request && !(http.request as any).__claudeTraceInstrumented) {
				const originalHttpRequest = http.request;
				http.request = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpRequest, options, callback, false);
				};
				(http.request as any).__claudeTraceInstrumented = true;
			}

			// Instrument http.get
			if (http.get && !(http.get as any).__claudeTraceInstrumented) {
				const originalHttpGet = http.get;
				http.get = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpGet, options, callback, false);
				};
				(http.get as any).__claudeTraceInstrumented = true;
			}

			// Instrument https.request
			if (https.request && !(https.request as any).__claudeTraceInstrumented) {
				const originalHttpsRequest = https.request;
				https.request = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpsRequest, options, callback, true);
				};
				(https.request as any).__claudeTraceInstrumented = true;
			}

			// Instrument https.get
			if (https.get && !(https.get as any).__claudeTraceInstrumented) {
				const originalHttpsGet = https.get;
				https.get = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpsGet, options, callback, true);
				};
				(https.get as any).__claudeTraceInstrumented = true;
			}
		} catch (error) {
			// Silent error handling
		}
	}

	private interceptNodeRequest(originalRequest: any, options: any, callback: any, isHttps: boolean) {
		// Parse URL from options
		const url = this.parseNodeRequestURL(options, isHttps);

		if (!this.isAnthropicAPI(url)) {
			return originalRequest.call(this, options, callback);
		}

		const requestTimestamp = Date.now();
		let requestBody = "";

		// Create the request
		const req = originalRequest.call(this, options, (res: any) => {
			const responseTimestamp = Date.now();
			let responseBody = "";

			// Capture response data
			res.on("data", (chunk: any) => {
				responseBody += chunk;
			});

			res.on("end", async () => {
				// Process the captured request/response
				const requestData = {
					timestamp: requestTimestamp / 1000,
					method: options.method || "GET",
					url: url,
					headers: this.redactSensitiveHeaders(options.headers || {}),
					body: requestBody ? await this.parseRequestBody(requestBody) : null,
				};

				const responseData = {
					timestamp: responseTimestamp / 1000,
					status_code: res.statusCode,
					headers: this.redactSensitiveHeaders(res.headers || {}),
					...(await this.parseResponseBodyFromString(responseBody, res.headers["content-type"])),
				};

				const pair: RawPair = {
					request: requestData,
					response: responseData,
					logged_at: new Date().toISOString(),
				};

				this.pairs.push(pair);
				await this.writePairToLog(pair);

				if (this.config.enableRealTimeHTML) {
					await this.generateHTML();
				}
			});

			// Call original callback if provided
			if (callback) {
				callback(res);
			}
		});

		// Capture request body
		const originalWrite = req.write;
		req.write = function (chunk: any) {
			if (chunk) {
				requestBody += chunk;
			}
			return originalWrite.call(this, chunk);
		};

		return req;
	}

	private parseNodeRequestURL(options: any, isHttps: boolean): string {
		if (typeof options === "string") {
			return options;
		}

		const protocol = isHttps ? "https:" : "http:";
		const hostname = options.hostname || options.host || "localhost";
		const port = options.port ? `:${options.port}` : "";
		const path = options.path || "/";

		return `${protocol}//${hostname}${port}${path}`;
	}

	private async parseResponseBodyFromString(
		body: string,
		contentType?: string,
	): Promise<{ body?: any; body_raw?: string; streaming_details?: StreamingDetails }> {
		try {
			if (contentType && contentType.includes("application/json")) {
				return { body: JSON.parse(body) };
			} else if (contentType && contentType.includes("text/event-stream")) {
				// For Node.js HTTP streaming, parse the complete body as if it were streaming chunks
				const startTime = Date.now() / 1000;
				const parsedChunks = this.parseChunkData(body, 1, startTime);
				const streaming_details = this.buildStreamingDetails(parsedChunks, startTime);
				return { body_raw: body, streaming_details };
			} else {
				return { body_raw: body };
			}
		} catch (error) {
			return { body_raw: body };
		}
	}

	private rotateLogFile(): void {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, -5);
		this.logFile = path.join(this.logDir, `log-${timestamp}.jsonl`);
		this.htmlFile = path.join(this.logDir, `log-${timestamp}.html`);
		fs.writeFileSync(this.logFile, "");
	}

	private async writePairToLog(pair: RawPair): Promise<void> {
		try {
			const jsonLine = JSON.stringify(pair) + "\n";

			// Check file size before writing
			if (fs.existsSync(this.logFile)) {
				const stats = fs.statSync(this.logFile);
				if (stats.size >= this.config.maxLogSize!) {
					this.rotateLogFile();
				}
			}

			fs.appendFileSync(this.logFile, jsonLine);
		} catch (error) {
			// Silent error handling during runtime
		}
	}

	private async generateHTML(): Promise<void> {
		try {
			const includeAllRequests = process.env.CLAUDE_TRACE_INCLUDE_ALL_REQUESTS === "true";
			await this.htmlGenerator.generateHTML(this.pairs, this.htmlFile, {
				title: `${this.pairs.length} API Calls`,
				timestamp: new Date().toISOString().replace("T", " ").slice(0, -5),
				includeAllRequests,
			});
			// Silent HTML generation
		} catch (error) {
			// Silent error handling during runtime
		}
	}

	public async cleanup(): Promise<void> {
		console.log("Cleaning up orphaned requests...");

		// Clean up zero-latency interceptor if enabled
		if (this.zeroLatencyInterceptor) {
			await this.zeroLatencyInterceptor.waitForCompletion();
			await this.zeroLatencyInterceptor.destroy();
		}

		for (const [, requestData] of this.pendingRequests.entries()) {
			const orphanedPair = {
				request: requestData,
				response: null,
				note: "ORPHANED_REQUEST - No matching response received",
				logged_at: new Date().toISOString(),
			};

			try {
				const jsonLine = JSON.stringify(orphanedPair) + "\n";
				fs.appendFileSync(this.logFile, jsonLine);
			} catch (error) {
				console.log(`Error writing orphaned request: ${error}`);
			}
		}

		this.pendingRequests.clear();
		console.log(`Cleanup complete. Logged ${this.pairs.length} pairs`);

		// Open browser if requested
		const shouldOpenBrowser = process.env.CLAUDE_TRACE_OPEN_BROWSER === "true";
		if (shouldOpenBrowser && fs.existsSync(this.htmlFile)) {
			try {
				spawn("open", [this.htmlFile], { detached: true, stdio: "ignore" }).unref();
				console.log(`🌐 Opening ${this.htmlFile} in browser`);
			} catch (error) {
				console.log(`❌ Failed to open browser: ${error}`);
			}
		}
	}

	public getStats() {
		const basicStats = {
			totalPairs: this.pairs.length,
			pendingRequests: this.pendingRequests.size,
			logFile: this.logFile,
			htmlFile: this.htmlFile,
		};

		// Add zero-latency stats if enabled
		if (this.zeroLatencyInterceptor) {
			return {
				...basicStats,
				zeroLatency: {
					enabled: true,
					performance: this.zeroLatencyInterceptor.getPerformanceMetrics(),
					processor: this.zeroLatencyInterceptor.getProcessorMetrics(),
					meetsTarget: this.zeroLatencyInterceptor.meetsZeroLatencyTarget(),
					queueSize: this.zeroLatencyInterceptor.getQueueSize(),
					bufferUtilization: this.zeroLatencyInterceptor.getBufferUtilization(),
				},
			};
		}

		return { ...basicStats, zeroLatency: { enabled: false } };
	}

	public getZeroLatencyReport(): string | null {
		if (!this.zeroLatencyInterceptor) {
			return null;
		}
		return this.zeroLatencyInterceptor.generatePerformanceReport();
	}
}

// Global logger instance
let globalLogger: ClaudeTrafficLogger | null = null;

// Track if event listeners have been set up
let eventListenersSetup = false;

export function initializeInterceptor(config?: InterceptorConfig): ClaudeTrafficLogger {
	if (globalLogger) {
		console.warn("Interceptor already initialized");
		return globalLogger;
	}

	globalLogger = new ClaudeTrafficLogger(config);
	globalLogger.instrumentAll();

	// Setup cleanup on process exit only once
	if (!eventListenersSetup) {
		const cleanup = async () => {
			if (globalLogger) {
				await globalLogger.cleanup();
			}
		};

		process.on("exit", () => {
			// For exit event, we can't await, so we just call cleanup
			if (globalLogger) {
				globalLogger.cleanup().catch(console.error);
			}
		});

		process.on("SIGINT", async () => {
			await cleanup();
			process.exit(0);
		});

		process.on("SIGTERM", async () => {
			await cleanup();
			process.exit(0);
		});

		process.on("uncaughtException", async (error) => {
			console.error("Uncaught exception:", error);
			await cleanup();
			process.exit(1);
		});

		eventListenersSetup = true;
	}

	return globalLogger;
}

export function getLogger(): ClaudeTrafficLogger | null {
	return globalLogger;
}
