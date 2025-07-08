# Frontend Utilities API Reference

The claude-trace frontend includes several utility modules for data processing, markdown rendering, and SSE stream reconstruction. This document covers all utility functions and their APIs.

## Data Processing Utilities

### `processRawPairs()`

```typescript
export function processRawPairs(pairs: RawPairData[]): ProcessedPair[];
```

Converts raw HTTP request/response pairs into typed ProcessedPair objects with enhanced metadata.

**Parameters**:

- `pairs`: Array of raw request/response pairs from the interceptor

**Returns**: Array of ProcessedPair objects with enhanced metadata

**Processing Steps**:

1. Extracts model information from request or response
2. Reconstructs messages from SSE streams
3. Adds unique IDs and timestamps
4. Preserves original request/response data
5. Adds processing metadata

**Example**:

```typescript
const rawPairs = window.claudeData.rawPairs;
const processedPairs = processRawPairs(rawPairs);

// Each processed pair includes:
// - id: Unique identifier
// - model: AI model used
// - reconstructed_message: Rebuilt from SSE
// - timestamp: Processing time
// - Original request/response data
```

**Error Handling**:

- Gracefully handles malformed pairs
- Logs warnings for invalid data
- Returns partial results on errors
- Maintains array integrity

### `reconstructMessageFromSSE()`

```typescript
export function reconstructMessageFromSSE(sseContent: string, requestBody: any): EnhancedMessageParam | null;
```

Rebuilds complete messages from Server-Sent Events streams, handling incremental updates and JSON accumulation.

**Parameters**:

- `sseContent`: Raw SSE stream content as string
- `requestBody`: Original request body for context

**Returns**: Complete reconstructed message or null if invalid

**SSE Event Types Handled**:

- `message_start`: Initializes message reconstruction
- `content_block_start`: Creates new content blocks
- `content_block_delta`: Accumulates incremental updates
- `content_block_stop`: Finalizes content blocks
- `message_stop`: Completes message reconstruction

**Content Block Types**:

- **Text blocks**: Accumulates text content
- **Tool use blocks**: Rebuilds tool calls with JSON inputs
- **Thinking blocks**: Captures internal reasoning

**Example**:

```typescript
const sseContent = `data: {"type": "message_start", "message": {...}}
data: {"type": "content_block_start", "index": 0, "content_block": {...}}
data: {"type": "content_block_delta", "index": 0, "delta": {...}}
data: {"type": "content_block_stop", "index": 0}
data: {"type": "message_stop"}`;

const reconstructed = reconstructMessageFromSSE(sseContent, requestBody);
// Returns complete message with all content blocks
```

**JSON Accumulation**:

- Handles partial JSON in tool inputs
- Accumulates fragments until complete
- Validates JSON structure
- Preserves original format

### `parseSSEEvents()`

```typescript
export function parseSSEEvents(sseContent: string): SSEEvent[];
```

Parses Server-Sent Events streams into structured event objects.

**Parameters**:

- `sseContent`: Raw SSE stream as string

**Returns**: Array of parsed SSE events

**SSE Format Support**:

- Standard SSE format with `data:` prefix
- JSON event payloads
- Event type detection
- Multi-line event handling

**Example**:

```typescript
const events = parseSSEEvents(sseContent);
events.forEach((event) => {
	console.log(`Event type: ${event.type}`);
	console.log(`Event data:`, event.data);
});
```

**Event Structure**:

```typescript
interface SSEEvent {
	type: string;
	data: any;
	raw?: string;
}
```

## Markdown Processing Utilities

### `markdownToHtml()`

```typescript
export function markdownToHtml(markdown: string): string;
```

Converts markdown content to HTML with XSS protection and GitHub Flavored Markdown support.

**Parameters**:

- `markdown`: Markdown content string

**Returns**: Safe HTML string

**Features**:

- GitHub Flavored Markdown support
- Syntax highlighting for code blocks
- XSS prevention through HTML escaping
- Table support
- Task list support
- Strikethrough support

**Example**:

```typescript
const markdown = `
# Header

This is **bold** and *italic* text.

\`\`\`typescript
const example = "code block";
\`\`\`

- [ ] Task 1
- [x] Task 2
`;

const html = markdownToHtml(markdown);
// Returns safe HTML with proper formatting
```

**Security Features**:

- HTML entity escaping
- Script tag removal
- Attribute sanitization
- Link validation

**Error Handling**:

- Graceful fallback to plain text
- Preserves line breaks on errors
- Logs warnings for invalid markdown
- Never throws exceptions

## Conversation Processing Utilities

### `SharedConversationProcessor`

The SharedConversationProcessor class provides conversation merging and analysis functionality.

#### `processRawPairs()`

```typescript
processRawPairs(pairs: RawPair[]): ProcessedPair[]
```

Processes raw pairs into structured format with enhanced metadata.

**Features**:

- Model detection and extraction
- Message reconstruction from SSE
- Unique ID generation
- Timestamp normalization

#### `mergeConversations()`

```typescript
mergeConversations(pairs: ProcessedPair[]): SimpleConversation[]
```

Merges related API calls into conversation threads.

**Logic**:

1. Groups pairs by conversation context
2. Merges system prompts and messages
3. Tracks model usage per conversation
4. Calculates conversation metadata

**Example**:

```typescript
const processor = new SharedConversationProcessor();
const pairs = processor.processRawPairs(rawPairs);
const conversations = processor.mergeConversations(pairs);
```

### `filterOrphanedRequests()`

```typescript
export function filterOrphanedRequests(pairs: RawPairData[]): RawPairData[];
```

Filters out orphaned requests (requests without responses).

**Parameters**:

- `pairs`: Array of raw request/response pairs

**Returns**: Array of complete pairs only

**Criteria**:

- Must have both request and response
- Response must not be null
- Status code must be present

**Example**:

```typescript
const completePairs = filterOrphanedRequests(rawPairs);
// Only includes pairs with valid responses
```

## Type Definitions

### `RawPairData`

Raw request/response pair from the interceptor.

```typescript
interface RawPairData {
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
	};
	logged_at: string;
	note?: string;
}
```

### `ProcessedPair`

Enhanced pair with processing metadata.

```typescript
interface ProcessedPair {
	id: string;
	request: any;
	response: any;
	reconstructed_message?: EnhancedMessageParam;
	model?: string;
	timestamp: number;
	status_code: number;
	note?: string;
}
```

### `EnhancedMessageParam`

Extended message parameter with additional metadata.

```typescript
interface EnhancedMessageParam extends MessageParam {
	hide?: boolean;
	compacted?: boolean;
	tool_results?: any[];
	thinking?: string;
	metadata?: {
		tokens?: number;
		model?: string;
		timestamp?: number;
	};
}
```

### `SSEEvent`

Parsed Server-Sent Event structure.

```typescript
interface SSEEvent {
	type: string;
	data: any;
	raw?: string;
}
```

## Error Handling

### Graceful Degradation

All utility functions include comprehensive error handling:

```typescript
try {
	const result = processRawPairs(pairs);
	return result;
} catch (error) {
	console.warn("Processing failed:", error);
	return []; // Return empty array instead of throwing
}
```

### Logging Strategy

- **Info**: Successful operations
- **Warn**: Recoverable errors
- **Error**: Critical failures
- **Debug**: Detailed processing info

### Error Types

Common error scenarios and handling:

1. **Invalid JSON**: Fallback to text content
2. **Missing data**: Use default values
3. **Network errors**: Retry with backoff
4. **Type mismatches**: Graceful conversion

## Performance Optimizations

### Memory Management

- Efficient string processing
- Minimal object creation
- Proper cleanup of large data
- Streaming for large SSE content

### Processing Optimizations

- Lazy evaluation where possible
- Caching of expensive operations
- Batch processing for arrays
- Early termination on errors

### Example Performance Monitoring

```typescript
console.time("processRawPairs");
const processed = processRawPairs(rawPairs);
console.timeEnd("processRawPairs");

console.log(`Processed ${processed.length} pairs`);
```

## Usage Examples

### Complete Data Processing Pipeline

```typescript
// 1. Load raw data
const rawData = window.claudeData;

// 2. Filter orphaned requests
const completePairs = filterOrphanedRequests(rawData.rawPairs);

// 3. Process pairs
const processedPairs = processRawPairs(completePairs);

// 4. Merge conversations
const processor = new SharedConversationProcessor();
const conversations = processor.mergeConversations(processedPairs);

// 5. Extract models
const models = new Set(processedPairs.map((p) => p.model).filter((m) => m));
```

### SSE Stream Processing

```typescript
// Raw SSE content from API response
const sseContent = response.body_raw;

// Parse into events
const events = parseSSEEvents(sseContent);

// Reconstruct complete message
const message = reconstructMessageFromSSE(sseContent, request.body);

// Use reconstructed message
if (message) {
	displayMessage(message);
}
```

### Markdown Rendering

```typescript
// Convert markdown to HTML
const htmlContent = markdownToHtml(messageContent);

// Render in component
render() {
  return html`
    <div class="markdown-content">
      ${unsafeHTML(htmlContent)}
    </div>
  `;
}
```

## Testing Utilities

### Mock Data Generation

```typescript
export function createMockRawPair(overrides?: Partial<RawPairData>): RawPairData {
	return {
		request: {
			timestamp: Date.now() / 1000,
			method: "POST",
			url: "https://api.anthropic.com/v1/messages",
			headers: { "content-type": "application/json" },
			body: { messages: [] },
		},
		response: {
			timestamp: Date.now() / 1000,
			status_code: 200,
			headers: { "content-type": "application/json" },
			body: { content: [] },
		},
		logged_at: new Date().toISOString(),
		...overrides,
	};
}
```

### Validation Helpers

```typescript
export function validateProcessedPair(pair: ProcessedPair): boolean {
	return !!(pair.id && pair.request && pair.response && pair.timestamp && pair.status_code);
}
```

## Browser Compatibility

### Supported Features

- ES6+ syntax via transpilation
- Async/await support
- Modern array methods
- JSON processing
- RegExp support

### Polyfills Required

- None for modern browsers
- Consider polyfills for IE11 if needed
- Web Components support
- Promise-based APIs

## Debugging

### Development Tools

Enable debug logging:

```typescript
localStorage.setItem("claude-trace-debug", "true");
```

### Common Issues

1. **SSE parsing errors**: Check content format
2. **JSON accumulation**: Verify event ordering
3. **Message reconstruction**: Validate event types
4. **Performance**: Monitor processing times
