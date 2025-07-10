// Types matching the frontend expectations for compatibility

export interface RawPair {
	request: {
		timestamp: number;
		method: string;
		url: string;
		headers: Record<string, string>;
		body: any;
	};
	response: {
		timestamp: number;
		status_code: number;
		headers: Record<string, string>;
		body?: any;
		body_raw?: string;
		events?: SSEEvent[];
		streaming_details?: StreamingDetails; // Note: Not included in JSONL output to avoid duplication with body_raw
	} | null; // null for orphaned requests
	logged_at: string;
	note?: string; // For orphaned requests
}

export interface SSEEvent {
	event: string;
	data: any;
	timestamp: string;
}

// New interfaces for real-time streaming metadata
export interface ParsedChunk {
	sequence: number;
	timestamp: number;
	event_type: string;
	data: any;
	chunk_timing_ms: number;
}

export interface StreamingDetails {
	chunk_count: number;
	first_chunk_timestamp: number;
	last_chunk_timestamp: number;
	total_duration_ms: number;
	chunks: ParsedChunk[];
}

export interface ClaudeData {
	rawPairs: RawPair[];
	timestamp?: string;
	metadata?: Record<string, any>;
}

// Zero-latency interceptor types
export interface ZeroLatencyConfig {
	enabled: boolean;
	backgroundWorkers?: number;
	writeBufferSize?: number;
	writeBufferFlushMs?: number;
	deferredParsing?: boolean;
	memoryPoolSize?: number;
}

export interface ProcessingTask {
	stream: ReadableStream<Uint8Array>;
	timestamp: number;
	requestId: string;
	requestData: any;
	responseMetadata: any;
}

export interface LogEntry {
	requestId: string;
	timestamp: number;
	rawChunks: Buffer[];
	requestData: any;
	responseMetadata: any;
	parsed?: boolean;
}

export interface PerformanceMetrics {
	interceptorLatency: number;
	totalRequests: number;
	backgroundQueueSize: number;
	memoryUsage: number;
	lastMeasurement: number;
}

// Internal types for HTML generation
export interface HTMLGenerationData {
	rawPairs: RawPair[];
	timestamp: string;
	title?: string;
	includeAllRequests?: boolean;
}

export interface TemplateReplacements {
	__CLAUDE_LOGGER_BUNDLE_REPLACEMENT_UNIQUE_9487__: string;
	__CLAUDE_LOGGER_DATA_REPLACEMENT_UNIQUE_9487__: string;
	__CLAUDE_LOGGER_TITLE_REPLACEMENT_UNIQUE_9487__: string;
}

// Frontend-specific types
export interface ProcessedConversation {
	id: string;
	model: string;
	messages: any[]; // Original message format from API
	system?: any; // System prompt
	latestResponse?: string; // Latest assistant response
	pairs: RawPair[]; // All pairs in this conversation
	metadata: {
		startTime: string;
		endTime: string;
		totalPairs: number;
		totalTokens?: number;
		tokenUsage?: {
			input: number;
			output: number;
		};
	};
	rawPairs: RawPair[]; // Keep for compatibility
}

export interface ProcessedMessage {
	role: "user" | "assistant" | "system";
	content: string;
	thinking?: string;
	toolCalls?: ToolCall[];
	metadata?: {
		timestamp: string;
		model?: string;
	};
}

export interface ToolCall {
	id: string;
	type: string;
	name: string;
	input: any;
	result?: any;
	error?: string;
}

declare global {
	interface Window {
		claudeData: ClaudeData;
	}
}
