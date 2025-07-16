// CommonJS loader for interceptor
try {
	// Try to load the compiled JS version first
	const path = require("path");
	const fs = require("fs");

	const jsPath = path.join(__dirname, "interceptor.js");
	const tsPath = path.join(__dirname, "interceptor.ts");

	// Create configuration based on environment variables
	const config = {
		enableRealTimeHTML: process.env.CLAUDE_TRACE_ENABLE_HTML === "true",
		zeroLatency:
			process.env.CLAUDE_TRACE_ZERO_LATENCY !== "false"
				? {
						enabled: true,
						backgroundWorkers: parseInt(process.env.CLAUDE_TRACE_ZERO_LATENCY_WORKERS || "1"),
						writeBufferSize: parseInt(process.env.CLAUDE_TRACE_ZERO_LATENCY_BUFFER_SIZE || "100"),
						writeBufferFlushMs: parseInt(process.env.CLAUDE_TRACE_ZERO_LATENCY_FLUSH_MS || "100"),
						deferredParsing: process.env.CLAUDE_TRACE_ZERO_LATENCY_DEFERRED_PARSING !== "false",
						memoryPoolSize: parseInt(process.env.CLAUDE_TRACE_ZERO_LATENCY_MEMORY_POOL_SIZE || "10485760"), // 10MB
					}
				: undefined,
	};

	if (fs.existsSync(jsPath)) {
		// Use compiled JavaScript
		const { initializeInterceptor } = require("./interceptor.js");
		initializeInterceptor(config);
	} else if (fs.existsSync(tsPath)) {
		// Use TypeScript via tsx
		require("tsx/cjs/api").register();
		const { initializeInterceptor } = require("./interceptor.ts");
		initializeInterceptor(config);
	} else {
		console.error("Could not find interceptor file");
		process.exit(1);
	}
} catch (error) {
	console.error("Error loading interceptor:", error.message);
	process.exit(1);
}
