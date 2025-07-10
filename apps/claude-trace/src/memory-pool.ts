/**
 * Memory pool for efficient buffer management in zero-latency mode
 */
export class MemoryPool {
	private pools: Map<number, Buffer[]> = new Map();
	private readonly maxPoolSize: number;
	private readonly defaultSizes: number[] = [1024, 4096, 16384, 65536]; // Common buffer sizes
	private totalAllocated = 0;
	private totalReused = 0;

	constructor(maxPoolSize: number = 10 * 1024 * 1024) {
		// 10MB default
		this.maxPoolSize = maxPoolSize;

		// Pre-allocate buffers for common sizes
		this.defaultSizes.forEach((size) => {
			this.pools.set(size, []);
		});
	}

	/**
	 * Get a buffer from the pool or allocate a new one
	 */
	getBuffer(size: number): Buffer {
		const pool = this.pools.get(size);

		if (pool && pool.length > 0) {
			const buffer = pool.pop()!;
			this.totalReused++;
			return buffer;
		}

		// Allocate new buffer
		const buffer = Buffer.allocUnsafe(size);
		this.totalAllocated++;
		return buffer;
	}

	/**
	 * Return a buffer to the pool for reuse
	 */
	returnBuffer(buffer: Buffer): void {
		const size = buffer.length;

		if (!this.pools.has(size)) {
			this.pools.set(size, []);
		}

		const pool = this.pools.get(size)!;

		// Only pool if we haven't exceeded memory limit
		if (this.getCurrentMemoryUsage() < this.maxPoolSize) {
			// Clear buffer contents for security
			buffer.fill(0);
			pool.push(buffer);
		}
	}

	/**
	 * Get a buffer suitable for the given data
	 */
	getBufferForData(data: Uint8Array): Buffer {
		const size = this.getOptimalBufferSize(data.length);
		const buffer = this.getBuffer(size);

		// Copy data to buffer
		buffer.set(data, 0);

		return buffer.subarray(0, data.length);
	}

	/**
	 * Get optimal buffer size for given data length
	 */
	private getOptimalBufferSize(dataLength: number): number {
		// Find the smallest buffer size that can hold the data
		for (const size of this.defaultSizes) {
			if (size >= dataLength) {
				return size;
			}
		}

		// If data is larger than default sizes, round up to next power of 2
		return Math.pow(2, Math.ceil(Math.log2(dataLength)));
	}

	/**
	 * Get current memory usage of the pool
	 */
	getCurrentMemoryUsage(): number {
		let totalMemory = 0;

		for (const [size, pool] of this.pools) {
			totalMemory += size * pool.length;
		}

		return totalMemory;
	}

	/**
	 * Get pool statistics
	 */
	getStats(): {
		totalAllocated: number;
		totalReused: number;
		currentMemoryUsage: number;
		maxMemoryUsage: number;
		poolSizes: Record<number, number>;
		reuseRate: number;
	} {
		const poolSizes: Record<number, number> = {};

		for (const [size, pool] of this.pools) {
			poolSizes[size] = pool.length;
		}

		const total = this.totalAllocated + this.totalReused;
		const reuseRate = total > 0 ? this.totalReused / total : 0;

		return {
			totalAllocated: this.totalAllocated,
			totalReused: this.totalReused,
			currentMemoryUsage: this.getCurrentMemoryUsage(),
			maxMemoryUsage: this.maxPoolSize,
			poolSizes,
			reuseRate,
		};
	}

	/**
	 * Clear all pools
	 */
	clear(): void {
		this.pools.clear();
		this.defaultSizes.forEach((size) => {
			this.pools.set(size, []);
		});
		this.totalAllocated = 0;
		this.totalReused = 0;
	}

	/**
	 * Trim pools to reduce memory usage
	 */
	trim(): void {
		const currentUsage = this.getCurrentMemoryUsage();

		if (currentUsage <= this.maxPoolSize) {
			return;
		}

		// Remove buffers from pools, starting with largest sizes
		const sizes = Array.from(this.pools.keys()).sort((a, b) => b - a);

		for (const size of sizes) {
			const pool = this.pools.get(size)!;

			while (pool.length > 0 && this.getCurrentMemoryUsage() > this.maxPoolSize) {
				pool.pop();
			}
		}
	}

	/**
	 * Pre-allocate buffers for expected usage patterns
	 */
	preallocate(allocations: { size: number; count: number }[]): void {
		for (const { size, count } of allocations) {
			if (!this.pools.has(size)) {
				this.pools.set(size, []);
			}

			const pool = this.pools.get(size)!;

			for (let i = 0; i < count; i++) {
				if (this.getCurrentMemoryUsage() < this.maxPoolSize) {
					pool.push(Buffer.allocUnsafe(size));
				}
			}
		}
	}

	/**
	 * Get memory efficiency metrics
	 */
	getEfficiency(): {
		memoryEfficiency: number; // 0-1, higher is better
		poolUtilization: number; // 0-1, higher is better
		fragmentationRatio: number; // 0-1, lower is better
	} {
		const stats = this.getStats();
		const total = stats.totalAllocated + stats.totalReused;

		return {
			memoryEfficiency: stats.currentMemoryUsage > 0 ? (stats.totalReused * 100) / stats.currentMemoryUsage : 0,
			poolUtilization: stats.maxMemoryUsage > 0 ? stats.currentMemoryUsage / stats.maxMemoryUsage : 0,
			fragmentationRatio: total > 0 ? Object.keys(stats.poolSizes).length / total : 0,
		};
	}
}
