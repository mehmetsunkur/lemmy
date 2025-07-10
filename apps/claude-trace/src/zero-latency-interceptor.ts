import { ProcessingTask } from "./types";
import { BackgroundProcessor } from "./background-processor";
import { WriteBuffer } from "./write-buffer";
import { PerformanceMonitor } from "./performance-monitor";

export class ZeroLatencyInterceptor {
	private backgroundProcessor: BackgroundProcessor;
	private writeBuffer: WriteBuffer;
	private performanceMonitor: PerformanceMonitor;
	private readonly config: {
		backgroundWorkers: number;
		writeBufferSize: number;
		writeBufferFlushMs: number;
		memoryPoolSize: number;
	};

	constructor(
		logFile: string,
		config: {
			backgroundWorkers?: number;
			writeBufferSize?: number;
			writeBufferFlushMs?: number;
			memoryPoolSize?: number;
		} = {},
	) {
		this.config = {
			backgroundWorkers: config.backgroundWorkers || 1,
			writeBufferSize: config.writeBufferSize || 100,
			writeBufferFlushMs: config.writeBufferFlushMs || 100,
			memoryPoolSize: config.memoryPoolSize || 10 * 1024 * 1024, // 10MB
		};

		// Initialize components
		this.performanceMonitor = new PerformanceMonitor();
		this.writeBuffer = new WriteBuffer(logFile, {
			flushInterval: this.config.writeBufferFlushMs,
			maxBufferSize: this.config.writeBufferSize,
		});
		this.backgroundProcessor = new BackgroundProcessor(this.writeBuffer, this.performanceMonitor, {
			maxWorkers: this.config.backgroundWorkers,
		});
	}

	/**
	 * Intercept a streaming response with zero-latency pass-through
	 */
	async interceptStreamingResponse(response: Response, requestData: any, requestId: string): Promise<Response> {
		return this.performanceMonitor.measureInterceptorLatency(async () => {
			// Capture response metadata without consuming the body
			const responseMetadata = {
				timestamp: Date.now() / 1000,
				status_code: response.status,
				headers: Object.fromEntries(response.headers.entries()),
			};

			// Use tee() to split the stream for zero-copy processing
			const [passThrough, processing] = response.body!.tee();

			// Queue for background processing
			const task: ProcessingTask = {
				stream: processing,
				timestamp: Date.now() / 1000,
				requestId,
				requestData,
				responseMetadata,
			};

			this.backgroundProcessor.enqueue(task);
			this.performanceMonitor.incrementRequests();

			// Return immediately with pass-through stream
			return new Response(passThrough, {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			});
		});
	}

	/**
	 * Intercept a non-streaming response with zero-latency pass-through
	 */
	async interceptNonStreamingResponse(response: Response, requestData: any, requestId: string): Promise<Response> {
		return this.performanceMonitor.measureInterceptorLatency(async () => {
			// For non-streaming responses, we still want to minimize latency
			// Clone the response to avoid consuming the original body
			const clonedResponse = response.clone();

			// Capture response metadata
			const responseMetadata = {
				timestamp: Date.now() / 1000,
				status_code: response.status,
				headers: Object.fromEntries(response.headers.entries()),
			};

			// Queue for background processing
			if (clonedResponse.body) {
				const task: ProcessingTask = {
					stream: clonedResponse.body,
					timestamp: Date.now() / 1000,
					requestId,
					requestData,
					responseMetadata,
				};

				this.backgroundProcessor.enqueue(task);
			}

			this.performanceMonitor.incrementRequests();

			// Return the original response immediately
			return response;
		});
	}

	/**
	 * Get current performance metrics
	 */
	getPerformanceMetrics() {
		return this.performanceMonitor.getMetrics();
	}

	/**
	 * Get background processor metrics
	 */
	getProcessorMetrics() {
		return this.backgroundProcessor.getMetrics();
	}

	/**
	 * Check if zero-latency target is being met
	 */
	meetsZeroLatencyTarget(): boolean {
		return this.performanceMonitor.meetsZeroLatencyTarget();
	}

	/**
	 * Generate performance report
	 */
	generatePerformanceReport(): string {
		return this.performanceMonitor.generateReport();
	}

	/**
	 * Flush all pending writes
	 */
	async flush(): Promise<void> {
		await this.writeBuffer.flush();
	}

	/**
	 * Wait for all background processing to complete
	 */
	async waitForCompletion(): Promise<void> {
		await this.backgroundProcessor.waitForEmpty();
		await this.writeBuffer.flush();
	}

	/**
	 * Get current queue size
	 */
	getQueueSize(): number {
		return this.backgroundProcessor.getQueueSize();
	}

	/**
	 * Check if the interceptor is currently processing
	 */
	isProcessing(): boolean {
		return this.backgroundProcessor.isProcessingTasks();
	}

	/**
	 * Get buffer utilization
	 */
	getBufferUtilization(): number {
		return this.writeBuffer.getUtilization();
	}

	/**
	 * Clear all pending tasks and buffer
	 */
	clear(): void {
		this.backgroundProcessor.clear();
		this.writeBuffer.clear();
	}

	/**
	 * Reset performance metrics
	 */
	resetMetrics(): void {
		this.performanceMonitor.reset();
	}

	/**
	 * Destroy the interceptor and clean up resources
	 */
	async destroy(): Promise<void> {
		await this.backgroundProcessor.destroy();
		await this.writeBuffer.destroy();
	}
}
