# Zero-Latency Interceptor Specification

## Overview

This specification defines the architecture and implementation strategy for achieving zero-latency API interception in the claude-trace library. The goal is to add less than 0.1ms of overhead to Claude API calls while maintaining comprehensive logging capabilities.

## Current Performance Analysis

### Latency Sources

Based on analysis of the current implementation in `src/interceptor.ts`, the following operations contribute to latency:

1. **Synchronous File I/O** (lines 611-614)

   - `fs.appendFileSync()` blocks the response return
   - Estimated impact: 1-5ms per write

2. **Real-time Chunk Parsing** (lines 224-318)

   - JSON parsing for every SSE event
   - Timestamp calculations for each chunk
   - Estimated impact: 0.5-2ms per chunk

3. **Response Cloning** (lines 392, 98-101)

   - `response.clone()` duplicates the entire response
   - Estimated impact: 0.2-1ms

4. **HTML Generation** (lines 420-423)

   - Optional but adds 5-20ms when enabled
   - File I/O for HTML writing

5. **Memory Allocations**
   - Creating ParsedChunk objects for each event
   - Map operations for request tracking
   - Estimated impact: 0.1-0.5ms

### Current Total Overhead

- Non-streaming requests: ~2-8ms
- Streaming requests: ~5-25ms (depending on chunk count)

## Zero-Latency Architecture

### Core Principle: Pass-Through Design

The interceptor should act as a transparent proxy, immediately returning the original response while capturing data in the background.

```typescript
// Conceptual flow
async intercept(request, response) {
  // 1. Clone response headers only (not body)
  const responseMetadata = captureMetadata(response);

  // 2. Queue for background processing
  backgroundQueue.add({ request, responseMetadata, responseReader: response.body });

  // 3. Return original response immediately
  return response; // < 0.1ms total time
}
```

### Key Components

#### 1. Response Pass-Through

- Return the original response without cloning
- Use `response.body.tee()` for zero-copy stream splitting
- Process the teed stream in background

#### 2. Background Processing Queue

- Non-blocking queue for deferred processing
- Worker thread or async task pool
- Batched file writes

#### 3. Lazy Parsing Strategy

- Store raw SSE data initially
- Parse only when needed (HTML generation, analysis)
- Use streaming JSON parser for large responses

#### 4. Memory Pool

- Pre-allocated buffers for common operations
- Reuse objects to minimize GC pressure
- Ring buffer for streaming chunks

## Implementation Strategy

### Phase 1: Pass-Through Response Handler

```typescript
private async handleStreamingResponse(response: Response): Promise<Response> {
  if (!this.config.zeroLatencyMode) {
    // Fallback to current implementation
    return this.currentHandleStreamingResponse(response);
  }

  // Zero-latency implementation
  const [passThrough, processing] = response.body!.tee();

  // Queue for background processing
  this.enqueueBackgroundProcessing({
    stream: processing,
    timestamp: Date.now() / 1000,
    requestId: this.currentRequestId
  });

  // Return immediately with pass-through stream
  return new Response(passThrough, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
```

### Phase 2: Background Processing System

```typescript
class BackgroundProcessor {
	private queue: AsyncQueue<ProcessingTask>;
	private writeBuffer: WriteBuffer;

	async processTask(task: ProcessingTask) {
		const chunks: Buffer[] = [];
		const reader = task.stream.getReader();

		// Collect chunks without parsing
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(Buffer.from(value));
		}

		// Batch write to disk
		const entry = {
			requestId: task.requestId,
			timestamp: task.timestamp,
			rawChunks: chunks,
			// Parsing deferred until needed
		};

		await this.writeBuffer.write(entry);
	}
}
```

### Phase 3: Asynchronous Write Buffer

```typescript
class WriteBuffer {
	private buffer: LogEntry[] = [];
	private flushTimer?: NodeJS.Timer;
	private readonly flushInterval = 100; // ms
	private readonly maxBufferSize = 100; // entries

	async write(entry: LogEntry) {
		this.buffer.push(entry);

		if (this.buffer.length >= this.maxBufferSize) {
			await this.flush();
		} else if (!this.flushTimer) {
			this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
		}
	}

	private async flush() {
		if (this.buffer.length === 0) return;

		const entries = this.buffer.splice(0);
		const data = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";

		// Non-blocking write
		await fs.promises.appendFile(this.logFile, data);

		clearTimeout(this.flushTimer);
		this.flushTimer = undefined;
	}
}
```

## Performance Targets

### Primary Goals

- **Added Latency**: < 0.1ms for API response delivery
- **Memory Overhead**: < 1MB per active request
- **CPU Usage**: < 5% additional CPU for logging

### Measurement Strategy

```typescript
// Performance wrapper
const start = process.hrtime.bigint();
const response = await originalFetch(url, options);
const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // ms
```

### Benchmarks

- Baseline: Direct fetch without interceptor
- Target: Interceptor adds < 0.1ms to baseline
- Stress test: 1000 concurrent requests
- Large payload test: 100MB streaming response

## Configuration Options

```typescript
interface ZeroLatencyConfig {
	enabled: boolean; // Enable zero-latency mode
	backgroundWorkers?: number; // Number of background processors (default: 1)
	writeBufferSize?: number; // Write buffer size in entries (default: 100)
	writeBufferFlushMs?: number; // Flush interval in ms (default: 100)
	deferredParsing?: boolean; // Defer SSE parsing (default: true)
	memoryPoolSize?: number; // Pre-allocated buffer pool size (default: 10MB)
}
```

## Trade-offs

### Features Affected in Zero-Latency Mode

1. **Real-time HTML Generation**

   - Delayed until background processing completes
   - May be several seconds behind actual requests

2. **Immediate Log Availability**

   - Logs written in batches, not immediately
   - Small delay (100-200ms) before disk persistence

3. **Memory Usage**

   - Higher memory usage due to buffering
   - Background queue may grow under high load

4. **Error Handling**
   - Failed writes may lose some log entries
   - Requires separate error recovery mechanism

### Compatibility Mode

The system will support both modes:

- **Standard Mode**: Current behavior, immediate processing
- **Zero-Latency Mode**: Pass-through with background processing

## Testing Strategy

### Performance Tests

1. **Latency Measurement**

   ```typescript
   describe("Zero-latency mode", () => {
   	it("adds less than 0.1ms latency", async () => {
   		const baseline = await measureFetchTime(url, options);
   		const intercepted = await measureInterceptedTime(url, options);
   		expect(intercepted - baseline).toBeLessThan(0.1);
   	});
   });
   ```

2. **Throughput Testing**

   - Measure requests per second with/without interceptor
   - Target: < 1% throughput reduction

3. **Memory Profiling**
   - Monitor heap usage during stress tests
   - Verify memory pool effectiveness

### Correctness Tests

1. **Data Integrity**

   - Verify all chunks are captured
   - Validate deferred parsing produces same results

2. **Edge Cases**
   - Network failures during streaming
   - Process termination during buffering
   - Large response handling

## Implementation Timeline

### Week 1: Core Pass-Through

- Implement response.body.tee() splitting
- Basic background queue
- Performance measurement framework

### Week 2: Background Processing

- Async write buffer implementation
- Deferred parsing system
- Memory pool optimization

### Week 3: Testing & Optimization

- Comprehensive performance tests
- Memory profiling and optimization
- Documentation and examples

## Success Criteria

1. **Performance**: < 0.1ms added latency verified by automated tests
2. **Reliability**: No data loss under normal operations
3. **Compatibility**: Existing code continues to work without changes
4. **Scalability**: Handles 10,000+ requests/second without degradation
5. **Memory Efficiency**: < 100MB memory overhead under peak load

## Future Enhancements

1. **Binary Log Format**: Replace JSON with more efficient format
2. **Compression**: Gzip log entries before writing
3. **Stream Processing**: Process chunks as they arrive without buffering
4. **Distributed Logging**: Send logs to remote service asynchronously
5. **Smart Sampling**: Intelligently sample requests under extreme load
