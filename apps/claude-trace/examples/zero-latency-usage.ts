#!/usr/bin/env npx tsx

/**
 * Zero-Latency Mode Usage Examples
 *
 * This file demonstrates how to use and configure the zero-latency interceptor.
 * Zero-latency mode is now ENABLED BY DEFAULT for optimal performance.
 *
 * These examples show various configurations and how to disable zero-latency
 * mode when needed for compatibility or specific requirements.
 */

import { ClaudeTrafficLogger, InterceptorConfig } from "../src/interceptor";

// Example 1: Default Configuration (Zero-Latency Enabled by Default)
export function defaultSetup(): ClaudeTrafficLogger {
	console.log("✨ Using default configuration (zero-latency enabled automatically)...");

	// Minimal configuration - zero-latency is enabled by default
	const config: InterceptorConfig = {
		logDirectory: ".claude-trace",
		// Zero-latency mode is automatically enabled with optimal defaults
	};

	const logger = new ClaudeTrafficLogger(config);

	console.log("✅ Zero-latency mode enabled by default with optimal settings");
	return logger;
}

// Example 2: Basic Zero-Latency Configuration (Explicit)
export function basicZeroLatencySetup(): ClaudeTrafficLogger {
	console.log("🚀 Setting up explicit zero-latency configuration...");

	const config: InterceptorConfig = {
		logDirectory: ".claude-trace",
		enableRealTimeHTML: false, // Disable for better performance
		zeroLatency: {
			enabled: true,
			// Use defaults for other options
		},
	};

	const logger = new ClaudeTrafficLogger(config);

	console.log("✅ Zero-latency mode explicitly enabled with default settings");
	return logger;
}

// Example 3: Disable Zero-Latency Mode (for Compatibility)
export function disableZeroLatencySetup(): ClaudeTrafficLogger {
	console.log("📊 Setting up standard mode (zero-latency disabled)...");

	const config: InterceptorConfig = {
		logDirectory: ".claude-trace",
		enableRealTimeHTML: true, // Can enable for immediate HTML generation
		zeroLatency: {
			enabled: false, // Explicitly disable zero-latency mode
		},
	};

	const logger = new ClaudeTrafficLogger(config);

	console.log("✅ Standard mode enabled (zero-latency disabled)");
	return logger;
}

// Example 4: High-Performance Configuration
export function highPerformanceSetup(): ClaudeTrafficLogger {
	console.log("⚡ Setting up high-performance zero-latency configuration...");

	const config: InterceptorConfig = {
		logDirectory: ".claude-trace",
		enableRealTimeHTML: false,
		maxLogSize: 10 * 1024 * 1024, // 10MB log files
		zeroLatency: {
			enabled: true,
			backgroundWorkers: 2, // More workers for high load
			writeBufferSize: 200, // Larger buffer
			writeBufferFlushMs: 50, // Faster flushes
			deferredParsing: true,
			memoryPoolSize: 20 * 1024 * 1024, // 20MB memory pool
		},
	};

	const logger = new ClaudeTrafficLogger(config);

	console.log("✅ High-performance zero-latency mode configured");
	return logger;
}

// Example 5: Memory-Constrained Configuration
export function memoryConstrainedSetup(): ClaudeTrafficLogger {
	console.log("💾 Setting up memory-constrained zero-latency configuration...");

	const config: InterceptorConfig = {
		logDirectory: ".claude-trace",
		enableRealTimeHTML: false,
		zeroLatency: {
			enabled: true,
			backgroundWorkers: 1,
			writeBufferSize: 50, // Smaller buffer
			writeBufferFlushMs: 25, // Frequent flushes
			deferredParsing: true,
			memoryPoolSize: 5 * 1024 * 1024, // 5MB memory pool
		},
	};

	const logger = new ClaudeTrafficLogger(config);

	console.log("✅ Memory-constrained zero-latency mode configured");
	return logger;
}

// Example 6: Development/Debug Configuration
export function developmentSetup(): ClaudeTrafficLogger {
	console.log("🔧 Setting up development zero-latency configuration...");

	const config: InterceptorConfig = {
		logDirectory: ".claude-trace",
		enableRealTimeHTML: true, // Enable for immediate feedback
		logLevel: "debug" as const,
		zeroLatency: {
			enabled: true,
			backgroundWorkers: 1,
			writeBufferSize: 10, // Small buffer for immediate writes
			writeBufferFlushMs: 100,
			deferredParsing: false, // Immediate parsing for debugging
			memoryPoolSize: 1024 * 1024, // 1MB memory pool
		},
	};

	const logger = new ClaudeTrafficLogger(config);

	console.log("✅ Development zero-latency mode configured");
	return logger;
}

// Example 7: Performance Monitoring
export async function performanceMonitoringExample(): Promise<void> {
	console.log("📊 Demonstrating performance monitoring...");

	const logger = defaultSetup(); // Use default setup to show new behavior

	// Simulate some API calls
	console.log("Simulating API calls...");
	for (let i = 0; i < 10; i++) {
		// In real usage, these would be actual Claude API calls
		// The interceptor would automatically handle them
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Get performance statistics
	const stats = logger.getStats();
	console.log("\n📈 Performance Statistics:");
	console.log(JSON.stringify(stats.zeroLatency, null, 2));

	// Get detailed performance report
	const report = logger.getZeroLatencyReport();
	if (report) {
		console.log("\n📋 Performance Report:");
		console.log(report);
	}

	// Check if zero-latency target is being met
	if (stats.zeroLatency.enabled && stats.zeroLatency.meetsTarget) {
		console.log("✅ Zero-latency target is being met!");
	} else {
		console.log("⚠️ Zero-latency target not met - consider tuning configuration");
	}

	await logger.cleanup();
}

// Example 8: Environment Variable Configuration
export function environmentBasedSetup(): ClaudeTrafficLogger {
	console.log("🌍 Setting up environment-based configuration...");

	// Check environment variables (now defaults to enabled)
	const isZeroLatencyDisabled = process.env.CLAUDE_TRACE_ZERO_LATENCY === "false";
	const workers = parseInt(process.env.CLAUDE_TRACE_ZERO_LATENCY_WORKERS || "1");
	const bufferSize = parseInt(process.env.CLAUDE_TRACE_ZERO_LATENCY_BUFFER_SIZE || "100");

	const config: InterceptorConfig = {
		logDirectory: process.env.CLAUDE_TRACE_LOG_DIR || ".claude-trace",
		enableRealTimeHTML: process.env.CLAUDE_TRACE_ENABLE_HTML === "true",
		zeroLatency: !isZeroLatencyDisabled
			? {
					enabled: true,
					backgroundWorkers: workers,
					writeBufferSize: bufferSize,
					writeBufferFlushMs: parseInt(process.env.CLAUDE_TRACE_FLUSH_MS || "100"),
					deferredParsing: process.env.CLAUDE_TRACE_DEFERRED_PARSING !== "false",
					memoryPoolSize: parseInt(process.env.CLAUDE_TRACE_MEMORY_POOL_SIZE || "10485760"), // 10MB
				}
			: { enabled: false },
	};

	const logger = new ClaudeTrafficLogger(config);

	if (!isZeroLatencyDisabled) {
		console.log(`✅ Zero-latency mode enabled by default`);
		console.log(`   Workers: ${workers}, Buffer Size: ${bufferSize}`);
	} else {
		console.log("📝 Standard mode (zero-latency disabled via CLAUDE_TRACE_ZERO_LATENCY=false)");
	}

	return logger;
}

// Example 9: Graceful Shutdown
export async function gracefulShutdownExample(): Promise<void> {
	console.log("🔄 Demonstrating graceful shutdown...");

	const logger = defaultSetup(); // Use default setup

	// Set up graceful shutdown handlers
	const gracefulShutdown = async (signal: string) => {
		console.log(`\n📤 Received ${signal}, shutting down gracefully...`);

		// Wait for all background processing to complete
		console.log("⏳ Waiting for background processing to complete...");
		// Note: In real usage, this would be handled automatically by the cleanup process

		await logger.cleanup();
		console.log("✅ Graceful shutdown completed");
		process.exit(0);
	};

	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

	console.log("✅ Graceful shutdown handlers configured");
	console.log("💡 Press Ctrl+C to test graceful shutdown");

	// Keep the process running for demo
	await new Promise((resolve) => setTimeout(resolve, 1000));
	await logger.cleanup();
}

// Example 10: Configuration Validation
export function validateConfiguration(config: InterceptorConfig): boolean {
	console.log("🔍 Validating zero-latency configuration...");

	if (!config.zeroLatency?.enabled) {
		console.log("ℹ️ Zero-latency mode is disabled");
		return true;
	}

	const zl = config.zeroLatency;
	const warnings: string[] = [];
	const errors: string[] = [];

	// Validate configuration values
	if (zl.backgroundWorkers && zl.backgroundWorkers > 4) {
		warnings.push("backgroundWorkers > 4 may not provide additional benefits");
	}

	if (zl.writeBufferSize && zl.writeBufferSize > 1000) {
		warnings.push("writeBufferSize > 1000 may increase memory usage significantly");
	}

	if (zl.writeBufferFlushMs && zl.writeBufferFlushMs < 10) {
		warnings.push("writeBufferFlushMs < 10ms may impact performance");
	}

	if (zl.memoryPoolSize && zl.memoryPoolSize > 100 * 1024 * 1024) {
		warnings.push("memoryPoolSize > 100MB may be excessive for most use cases");
	}

	// Check for conflicts
	if (config.enableRealTimeHTML && zl.deferredParsing) {
		warnings.push("enableRealTimeHTML with deferredParsing may cause delays in HTML generation");
	}

	// Display results
	if (errors.length > 0) {
		console.log("❌ Configuration errors:");
		errors.forEach((error) => console.log(`   • ${error}`));
		return false;
	}

	if (warnings.length > 0) {
		console.log("⚠️ Configuration warnings:");
		warnings.forEach((warning) => console.log(`   • ${warning}`));
	}

	console.log("✅ Configuration validation completed");
	return true;
}

// Main demo function
async function runExamples(): Promise<void> {
	console.log("🎯 Zero-Latency Claude Trace Examples");
	console.log("📢 Zero-latency mode is now ENABLED BY DEFAULT!\n");

	try {
		// Show new default behavior
		console.log("📍 Example 1: Default Setup (Zero-Latency Auto-Enabled)");
		const defaultLogger = defaultSetup();
		await defaultLogger.cleanup();

		console.log("\n" + "─".repeat(50) + "\n");

		// Show how to disable zero-latency
		console.log("📍 Example 2: Disabling Zero-Latency for Compatibility");
		const standardLogger = disableZeroLatencySetup();
		await standardLogger.cleanup();

		console.log("\n" + "─".repeat(50) + "\n");

		// Show high-performance configuration
		console.log("📍 Example 3: High-Performance Configuration");
		const hpLogger = highPerformanceSetup();
		await hpLogger.cleanup();

		console.log("\n" + "─".repeat(50) + "\n");

		// Run performance monitoring example
		console.log("📍 Example 4: Performance Monitoring");
		await performanceMonitoringExample();

		console.log("\n" + "─".repeat(50) + "\n");

		// Validate configurations
		console.log("📍 Example 5: Configuration Validation");
		validateConfiguration({
			zeroLatency: {
				enabled: true, // Default behavior
				backgroundWorkers: 2,
				writeBufferSize: 100,
			},
		});

		console.log("\n✨ All examples completed successfully!");
		console.log("💡 Zero-latency mode provides optimal performance by default");
	} catch (error) {
		console.error("❌ Error running examples:", error);
		process.exit(1);
	}
}

// Run examples if called directly
if (require.main === module) {
	runExamples().catch(console.error);
}
