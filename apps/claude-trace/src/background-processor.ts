import { ProcessingTask, LogEntry } from "./types";
import { WriteBuffer } from "./write-buffer";
import { PerformanceMonitor } from "./performance-monitor";

export class BackgroundProcessor {
	private queue: ProcessingTask[] = [];
	private workers: Worker[] = [];
	private isProcessing = false;
	private isDestroyed = false;
	private readonly maxWorkers: number;
	private readonly writeBuffer: WriteBuffer;
	private readonly performanceMonitor: PerformanceMonitor;

	constructor(
		writeBuffer: WriteBuffer,
		performanceMonitor: PerformanceMonitor,
		options: {
			maxWorkers?: number;
		} = {},
	) {
		this.writeBuffer = writeBuffer;
		this.performanceMonitor = performanceMonitor;
		this.maxWorkers = options.maxWorkers || 1;
	}

	/**
	 * Add a task to the processing queue
	 */
	enqueue(task: ProcessingTask): void {
		if (this.isDestroyed) {
			throw new Error("BackgroundProcessor has been destroyed");
		}

		this.queue.push(task);
		this.performanceMonitor.updateQueueSize(this.queue.length);

		// Start processing if not already running
		if (!this.isProcessing) {
			this.startProcessing();
		}
	}

	/**
	 * Start processing tasks from the queue
	 */
	private startProcessing(): void {
		if (this.isProcessing || this.isDestroyed) {
			return;
		}

		this.isProcessing = true;
		this.processNextTask();
	}

	/**
	 * Process the next task in the queue
	 */
	private async processNextTask(): Promise<void> {
		if (this.queue.length === 0) {
			this.isProcessing = false;
			return;
		}

		const task = this.queue.shift();
		if (!task) {
			this.processNextTask();
			return;
		}

		this.performanceMonitor.updateQueueSize(this.queue.length);

		try {
			await this.processTask(task);
		} catch (error) {
			console.error("Background processing error:", error);
			// Continue processing other tasks
		}

		// Process next task
		if (!this.isDestroyed) {
			setImmediate(() => this.processNextTask());
		}
	}

	/**
	 * Process a single task
	 */
	private async processTask(task: ProcessingTask): Promise<void> {
		const chunks: Buffer[] = [];
		const reader = task.stream.getReader();

		try {
			// Collect all chunks from the stream
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(Buffer.from(value));
			}

			// Create log entry
			const logEntry: LogEntry = {
				requestId: task.requestId,
				timestamp: task.timestamp,
				rawChunks: chunks,
				requestData: task.requestData,
				responseMetadata: task.responseMetadata,
				parsed: false, // Will be parsed later if needed
			};

			// Write to buffer
			await this.writeBuffer.write(logEntry);
		} catch (error) {
			console.error("Stream processing error:", error);

			// Create error log entry
			const errorEntry: LogEntry = {
				requestId: task.requestId,
				timestamp: task.timestamp,
				rawChunks: [Buffer.from(`Error: ${error}`)],
				requestData: task.requestData,
				responseMetadata: {
					...task.responseMetadata,
					processingError: error instanceof Error ? error.message : "Unknown error",
				},
				parsed: false,
			};

			await this.writeBuffer.write(errorEntry);
		} finally {
			try {
				reader.releaseLock();
			} catch (releaseError) {
				// Ignore release errors
			}
		}
	}

	/**
	 * Get current queue size
	 */
	getQueueSize(): number {
		return this.queue.length;
	}

	/**
	 * Check if the processor is currently processing
	 */
	isProcessingTasks(): boolean {
		return this.isProcessing;
	}

	/**
	 * Get queue utilization metrics
	 */
	getMetrics(): {
		queueSize: number;
		isProcessing: boolean;
		totalTasksProcessed: number;
	} {
		return {
			queueSize: this.queue.length,
			isProcessing: this.isProcessing,
			totalTasksProcessed: 0, // TODO: Add counter
		};
	}

	/**
	 * Wait for all current tasks to complete
	 */
	async waitForEmpty(): Promise<void> {
		return new Promise((resolve) => {
			const checkEmpty = () => {
				if (this.queue.length === 0 && !this.isProcessing) {
					resolve();
				} else {
					setTimeout(checkEmpty, 10);
				}
			};
			checkEmpty();
		});
	}

	/**
	 * Clear all pending tasks
	 */
	clear(): void {
		this.queue = [];
		this.performanceMonitor.updateQueueSize(0);
	}

	/**
	 * Destroy the processor and clean up resources
	 */
	async destroy(): Promise<void> {
		if (this.isDestroyed) {
			return;
		}

		this.isDestroyed = true;

		// Wait for current processing to complete
		await this.waitForEmpty();

		// Clear any remaining tasks
		this.clear();
	}

	/**
	 * Check if the processor is destroyed
	 */
	getIsDestroyed(): boolean {
		return this.isDestroyed;
	}
}

/**
 * Simple worker interface for future enhancement
 */
interface Worker {
	id: number;
	busy: boolean;
	process(task: ProcessingTask): Promise<void>;
}
