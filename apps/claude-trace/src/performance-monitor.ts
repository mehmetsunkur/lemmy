import { PerformanceMetrics } from "./types";

export class PerformanceMonitor {
	private metrics: PerformanceMetrics;
	private measurementHistory: number[] = [];
	private readonly maxHistorySize = 100;

	constructor() {
		this.metrics = {
			interceptorLatency: 0,
			totalRequests: 0,
			backgroundQueueSize: 0,
			memoryUsage: 0,
			lastMeasurement: Date.now(),
		};
	}

	/**
	 * Measure latency added by the interceptor
	 */
	measureInterceptorLatency<T>(operation: () => Promise<T>): Promise<T> {
		const start = process.hrtime.bigint();

		return operation().then((result) => {
			const end = process.hrtime.bigint();
			const latencyMs = Number(end - start) / 1_000_000;

			this.updateLatencyMetrics(latencyMs);
			return result;
		});
	}

	/**
	 * Measure synchronous operation latency
	 */
	measureSyncLatency<T>(operation: () => T): T {
		const start = process.hrtime.bigint();
		const result = operation();
		const end = process.hrtime.bigint();

		const latencyMs = Number(end - start) / 1_000_000;
		this.updateLatencyMetrics(latencyMs);

		return result;
	}

	/**
	 * Update latency metrics with a new measurement
	 */
	private updateLatencyMetrics(latencyMs: number): void {
		this.measurementHistory.push(latencyMs);

		if (this.measurementHistory.length > this.maxHistorySize) {
			this.measurementHistory.shift();
		}

		// Calculate running average
		const sum = this.measurementHistory.reduce((acc, val) => acc + val, 0);
		this.metrics.interceptorLatency = sum / this.measurementHistory.length;
		this.metrics.lastMeasurement = Date.now();
	}

	/**
	 * Update request count
	 */
	incrementRequests(): void {
		this.metrics.totalRequests++;
	}

	/**
	 * Update background queue size
	 */
	updateQueueSize(size: number): void {
		this.metrics.backgroundQueueSize = size;
	}

	/**
	 * Update memory usage
	 */
	updateMemoryUsage(): void {
		const usage = process.memoryUsage();
		this.metrics.memoryUsage = usage.heapUsed / 1024 / 1024; // MB
	}

	/**
	 * Get current performance metrics
	 */
	getMetrics(): PerformanceMetrics {
		this.updateMemoryUsage();
		return { ...this.metrics };
	}

	/**
	 * Get average latency over the last N measurements
	 */
	getAverageLatency(lastN?: number): number {
		if (this.measurementHistory.length === 0) return 0;

		const measurements = lastN ? this.measurementHistory.slice(-lastN) : this.measurementHistory;

		return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
	}

	/**
	 * Get maximum latency recorded
	 */
	getMaxLatency(): number {
		return this.measurementHistory.length > 0 ? Math.max(...this.measurementHistory) : 0;
	}

	/**
	 * Get minimum latency recorded
	 */
	getMinLatency(): number {
		return this.measurementHistory.length > 0 ? Math.min(...this.measurementHistory) : 0;
	}

	/**
	 * Check if performance meets zero-latency target (< 0.1ms)
	 */
	meetsZeroLatencyTarget(): boolean {
		return this.getAverageLatency() < 0.1;
	}

	/**
	 * Generate performance report
	 */
	generateReport(): string {
		const metrics = this.getMetrics();
		const avg = this.getAverageLatency();
		const max = this.getMaxLatency();
		const min = this.getMinLatency();

		return `
Performance Report:
- Average Latency: ${avg.toFixed(3)}ms
- Min Latency: ${min.toFixed(3)}ms
- Max Latency: ${max.toFixed(3)}ms
- Zero-Latency Target Met: ${this.meetsZeroLatencyTarget() ? "✓" : "✗"}
- Total Requests: ${metrics.totalRequests}
- Queue Size: ${metrics.backgroundQueueSize}
- Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB
- Measurements: ${this.measurementHistory.length}
		`.trim();
	}

	/**
	 * Reset all metrics
	 */
	reset(): void {
		this.measurementHistory = [];
		this.metrics = {
			interceptorLatency: 0,
			totalRequests: 0,
			backgroundQueueSize: 0,
			memoryUsage: 0,
			lastMeasurement: Date.now(),
		};
	}
}
