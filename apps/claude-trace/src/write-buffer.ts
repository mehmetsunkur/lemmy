import fs from "fs";
import { LogEntry } from "./types";

export class WriteBuffer {
	private buffer: LogEntry[] = [];
	private flushTimer?: NodeJS.Timeout;
	private readonly flushInterval: number;
	private readonly maxBufferSize: number;
	private readonly logFile: string;
	private isDestroyed = false;

	constructor(
		logFile: string,
		options: {
			flushInterval?: number;
			maxBufferSize?: number;
		} = {},
	) {
		this.logFile = logFile;
		this.flushInterval = options.flushInterval || 100; // ms
		this.maxBufferSize = options.maxBufferSize || 100; // entries
	}

	/**
	 * Add a log entry to the buffer
	 */
	async write(entry: LogEntry): Promise<void> {
		if (this.isDestroyed) {
			throw new Error("WriteBuffer has been destroyed");
		}

		this.buffer.push(entry);

		// Flush if buffer is full
		if (this.buffer.length >= this.maxBufferSize) {
			await this.flush();
		} else if (!this.flushTimer) {
			// Schedule flush if no timer is running
			this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
		}
	}

	/**
	 * Force flush all buffered entries to disk
	 */
	async flush(): Promise<void> {
		if (this.isDestroyed || this.buffer.length === 0) {
			return;
		}

		// Clear the timer
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}

		// Get entries and clear buffer
		const entries = this.buffer.splice(0);

		try {
			// Convert entries to JSONL format
			const jsonlData =
				entries
					.map((entry) => this.convertLogEntryToRawPair(entry))
					.map((pair) => JSON.stringify(pair))
					.join("\n") + "\n";

			// Write to file asynchronously
			await fs.promises.appendFile(this.logFile, jsonlData);
		} catch (error) {
			// Log error but don't throw to avoid blocking the application
			console.error("WriteBuffer flush error:", error);

			// Re-add entries to buffer for retry
			this.buffer.unshift(...entries);

			// Schedule retry
			this.flushTimer = setTimeout(() => this.flush(), this.flushInterval * 2);
		}
	}

	/**
	 * Convert LogEntry to RawPair format for compatibility
	 */
	private convertLogEntryToRawPair(entry: LogEntry): any {
		// For deferred parsing, we'll store minimal data and parse later
		const pair = {
			request: entry.requestData,
			response: {
				...entry.responseMetadata,
				// Store raw chunks for later parsing
				body_raw: entry.rawChunks.map((chunk) => chunk.toString()).join(""),
			},
			logged_at: new Date(entry.timestamp * 1000).toISOString(),
			zeroLatency: true, // Mark as zero-latency processed
		};

		return pair;
	}

	/**
	 * Get current buffer size
	 */
	getBufferSize(): number {
		return this.buffer.length;
	}

	/**
	 * Check if buffer is empty
	 */
	isEmpty(): boolean {
		return this.buffer.length === 0;
	}

	/**
	 * Get buffer capacity utilization (0-1)
	 */
	getUtilization(): number {
		return this.buffer.length / this.maxBufferSize;
	}

	/**
	 * Clear all buffered entries without writing
	 */
	clear(): void {
		this.buffer = [];
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}
	}

	/**
	 * Destroy the buffer and flush remaining entries
	 */
	async destroy(): Promise<void> {
		if (this.isDestroyed) {
			return;
		}

		this.isDestroyed = true;

		// Flush remaining entries
		await this.flush();

		// Clear timer
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}
	}

	/**
	 * Check if the buffer is destroyed
	 */
	getIsDestroyed(): boolean {
		return this.isDestroyed;
	}
}
