# Interceptor API Reference

The interceptor module provides the core functionality for capturing HTTP traffic between Claude Code and the Anthropic API. It transparently intercepts all API calls, logs them to JSONL format, and optionally generates real-time HTML reports.

## Classes

### `ClaudeTrafficLogger`

The main class responsible for intercepting and logging API traffic.

#### Constructor

```typescript
constructor(config?: InterceptorConfig)
```

Creates a new instance of the traffic logger with optional configuration.

**Parameters**:

- `config` (optional): Configuration object for customizing logger behavior

**Example**:

```typescript
const logger = new ClaudeTrafficLogger({
	logDirectory: ".claude-trace",
	enableRealTimeHTML: false,
	logLevel: "info",
	maxLogSize: 5 * 1024 * 1024, // 5MB
});
```

#### Methods

##### `instrumentAll()`

```typescript
public instrumentAll(): void
```

Instruments both `fetch` API and Node.js HTTP/HTTPS modules. This is the main entry point for enabling traffic interception.

**Example**:

```typescript
logger.instrumentAll();
```

##### `instrumentFetch()`

```typescript
public instrumentFetch(): void
```

Instruments the global `fetch` API to intercept Anthropic API calls. Automatically called by `instrumentAll()`.

**Features**:

- Captures request method, URL, headers, and body
- Captures response status, headers, and body
- Handles both JSON and streaming (SSE) responses
- Preserves original fetch behavior for non-Anthropic URLs

##### `instrumentNodeHTTP()`

```typescript
public instrumentNodeHTTP(): void
```

Instruments Node.js `http` and `https` modules. Automatically called by `instrumentAll()`.

**Intercepted methods**:

- `http.request`
- `http.get`
- `https.request`
- `https.get`

##### `cleanup()`

```typescript
public cleanup(): void
```

Performs cleanup operations when the process exits. This method:

- Logs any orphaned requests (requests without responses)
- Clears pending request tracking
- Optionally opens the generated HTML report in browser
- Outputs statistics about logged pairs

**Note**: This is automatically called on process exit when using `initializeInterceptor()`.

##### `getStats()`

```typescript
public getStats(): {
  totalPairs: number;
  pendingRequests: number;
  logFile: string;
  htmlFile: string;
}
```

Returns current statistics about the logging session.

**Returns**:

- `totalPairs`: Total number of request/response pairs logged
- `pendingRequests`: Number of requests awaiting responses
- `logFile`: Path to the JSONL log file
- `htmlFile`: Path to the HTML report file

## Interfaces

### `InterceptorConfig`

Configuration options for the ClaudeTrafficLogger.

```typescript
interface InterceptorConfig {
	logDirectory?: string; // Directory for log files (default: ".claude-trace")
	enableRealTimeHTML?: boolean; // Generate HTML after each request (default: false)
	logLevel?: "debug" | "info" | "warn" | "error"; // Logging level (default: "info")
	maxLogSize?: number; // Maximum log file size in bytes (default: 3MB)
}
```

### `RawPair`

Structure of a logged request/response pair.

```typescript
interface RawPair {
	request: {
		timestamp: number; // Unix timestamp in seconds
		method: string; // HTTP method
		url: string; // Full URL
		headers: Record<string, string>; // Redacted headers
		body: any; // Parsed request body
	};
	response: {
		timestamp: number; // Unix timestamp in seconds
		status_code: number; // HTTP status code
		headers: Record<string, string>; // Response headers
		body?: any; // Parsed JSON body
		body_raw?: string; // Raw text body (for SSE)
	};
	logged_at: string; // ISO timestamp of logging
}
```

## Global Functions

### `initializeInterceptor()`

```typescript
export function initializeInterceptor(config?: InterceptorConfig): ClaudeTrafficLogger;
```

Initializes the global interceptor instance. This function:

- Creates a new ClaudeTrafficLogger instance
- Instruments all HTTP methods
- Sets up process exit handlers for cleanup
- Returns the logger instance

**Parameters**:

- `config` (optional): Configuration options

**Returns**: The initialized ClaudeTrafficLogger instance

##### `handleStreamingResponse()`

```typescript
private async handleStreamingResponse(response: Response): Promise<{ body_raw: string }>
```

Handles Server-Sent Events (SSE) streaming responses from the Anthropic API. This method:

- Reads the response stream chunk by chunk
- Logs individual chunks to a separate stream log file
- Returns the complete stream content as `body_raw`

**Features**:

- Memory efficient streaming without buffering entire response
- Individual chunk logging with timestamps
- Proper stream reader management with automatic cleanup

##### `logStreamChunk()`

```typescript
private logStreamChunk(chunk: string): void
```

Logs individual streaming chunks with metadata. Creates structured log entries for each chunk containing:

- Timestamp (Unix seconds)
- Chunk data
- Event type marker
- ISO timestamp for logging

##### `writeStreamEvent()`

```typescript
private writeStreamEvent(event: any): void
```

Writes streaming events to a separate `.stream.jsonl` file alongside the main log file. This allows for detailed analysis of streaming behavior without cluttering the main request/response log.

##### `rotateLogFile()`

```typescript
private rotateLogFile(): void
```

Rotates log files when they exceed the configured `maxLogSize`. Creates new timestamped log files and resets the current log file to prevent unlimited growth.

**Example**:

```typescript
import { initializeInterceptor } from "claude-trace";

const logger = initializeInterceptor({
	enableRealTimeHTML: true,
	maxLogSize: 10 * 1024 * 1024, // 10MB
});
```

### `getLogger()`

```typescript
export function getLogger(): ClaudeTrafficLogger | null;
```

Returns the global logger instance if initialized, or null otherwise.

**Example**:

```typescript
const logger = getLogger();
if (logger) {
	const stats = logger.getStats();
	console.log(`Logged ${stats.totalPairs} API calls`);
}
```

## Environment Variables

The interceptor respects the following environment variables:

### `CLAUDE_TRACE_INCLUDE_ALL_REQUESTS`

- **Type**: `"true" | "false"`
- **Default**: `"false"`
- **Description**: When `true`, captures all Anthropic API requests. When `false`, only captures `/v1/messages` endpoints with substantial conversations (more than 2 messages).

### `CLAUDE_TRACE_OPEN_BROWSER`

- **Type**: `"true" | "false"`
- **Default**: `"false"`
- **Description**: When `true`, automatically opens the generated HTML report in the default browser after cleanup.

### `NODE_OPTIONS`

The interceptor is designed to work with `NODE_OPTIONS="--no-deprecation"` to suppress Node.js deprecation warnings.

## Security Features

### Header Redaction

Sensitive headers are automatically redacted to prevent credential leakage. Redacted headers include:

- `authorization`
- `x-api-key`
- `x-auth-token`
- `cookie`
- `set-cookie`
- `x-session-token`
- `x-access-token`
- `bearer`
- `proxy-authorization`

**Redaction format**:

- Headers > 14 chars: Shows first 10 and last 4 characters
- Headers 5-14 chars: Shows first 2 and last 2 characters
- Headers < 5 chars: Completely redacted as `[REDACTED]`

## File Output

### JSONL Log File

**Location**: `{logDirectory}/log-YYYY-MM-DD-HH-MM-SS.jsonl`

Each line contains a JSON object representing a complete request/response pair:

```json
{
	"request": {
		/* request data */
	},
	"response": {
		/* response data */
	},
	"logged_at": "2024-01-15T10:30:45.123Z"
}
```

### Stream Log File

**Location**: `{logDirectory}/log-YYYY-MM-DD-HH-MM-SS.stream.jsonl`

Created automatically when streaming (SSE) responses are detected. Each line contains a JSON object for individual stream chunks:

```json
{
	"timestamp": 1705315845.123,
	"chunk_data": "data: {\"type\": \"message_delta\", \"delta\": {\"text\": \"Hello\"}}\n\n",
	"event_type": "stream_chunk",
	"logged_at": "2024-01-15T10:30:45.123Z"
}
```

**Features**:

- Separate from main log to avoid cluttering request/response pairs
- Individual chunk timestamps for latency analysis
- Complete stream reconstruction capability
- Automatic creation only when streaming responses occur

### HTML Report

**Location**: `{logDirectory}/log-YYYY-MM-DD-HH-MM-SS.html`

Self-contained HTML file with:

- Embedded JavaScript application
- Three view modes (Conversation, Raw Pairs, JSON)
- Syntax highlighting
- Tool call visualization
- Token usage statistics

## Usage Examples

### Basic Interception

```typescript
import { initializeInterceptor } from "claude-trace";

// Start logging with default configuration
const logger = initializeInterceptor();

// Your Claude Code application runs here
// All API calls are automatically logged
```

### Custom Configuration

```typescript
import { initializeInterceptor } from "claude-trace";

const logger = initializeInterceptor({
	logDirectory: "./my-logs",
	enableRealTimeHTML: true,
	logLevel: "debug",
	maxLogSize: 5 * 1024 * 1024, // 5MB
});

// Check statistics during runtime
setInterval(() => {
	const stats = logger.getStats();
	console.log(`Active requests: ${stats.pendingRequests}`);
}, 5000);
```

### Manual Cleanup

```typescript
import { getLogger } from "claude-trace";

// Perform manual cleanup if needed
process.on("SIGUSR2", () => {
	const logger = getLogger();
	if (logger) {
		logger.cleanup();
	}
});
```

## Error Handling

The interceptor is designed to be resilient and non-intrusive:

- Errors during logging don't affect the original API calls
- Failed interceptions fall back to original behavior
- All errors are silently handled to avoid disrupting Claude Code
- Orphaned requests are logged with special markers

## Log Rotation

The interceptor automatically rotates log files when they exceed the configured `maxLogSize` (default: 3MB). This prevents individual log files from growing too large and helps maintain system performance.

**Rotation Behavior**:

- Checks file size before each write operation
- Creates new timestamped log files when size limit is reached
- Resets the current log file to start fresh
- Preserves all existing log data in rotated files

**File Naming Pattern**:

- Original: `log-2024-01-15-10-30-45.jsonl`
- Rotated: `log-2024-01-15-10-45-22.jsonl` (new timestamp)

**Configuration**:

```typescript
const logger = initializeInterceptor({
	maxLogSize: 10 * 1024 * 1024, // 10MB before rotation
});
```

## Performance Considerations

- Minimal overhead: Interception adds negligible latency
- Async operations: All file I/O is non-blocking
- Memory efficient: Streams large responses without buffering
- Real-time HTML generation is optional to reduce I/O
- Automatic log rotation prevents unlimited file growth

## Compatibility

- **Node.js**: Version 16.0.0 or higher
- **APIs**: Works with both `fetch` and Node.js HTTP modules
- **Claude Code**: Compatible with all versions
- **TypeScript**: Full type definitions included
