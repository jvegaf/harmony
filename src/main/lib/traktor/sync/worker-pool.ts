/**
 * Worker Pool
 *
 * AIDEV-NOTE: Generic worker pool for managing multiple worker threads.
 * Provides task queuing, worker reuse, and automatic scaling.
 *
 * Usage:
 * ```typescript
 * const pool = new WorkerPool('/path/to/worker.js', { maxWorkers: 4 });
 * const result = await pool.runTask({ type: 'sync', data: ... });
 * pool.destroy();
 * ```
 */

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import log from 'electron-log';

/**
 * Worker pool configuration
 */
export interface WorkerPoolOptions {
  /** Maximum number of concurrent workers */
  maxWorkers?: number;
  /** Minimum number of idle workers to keep alive */
  minWorkers?: number;
  /** Idle timeout in ms before terminating unused workers */
  idleTimeout?: number;
}

/**
 * Task to be executed by a worker
 */
export interface WorkerTask<TInput = unknown, TOutput = unknown> {
  id: string;
  input: TInput;
  resolve: (value: TOutput) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: unknown) => void;
}

/**
 * Worker instance wrapper
 */
interface PoolWorker {
  worker: Worker;
  busy: boolean;
  idleTimer?: NodeJS.Timeout;
}

/**
 * Generic worker pool for managing background tasks
 */
export class WorkerPool<TInput = unknown, TOutput = unknown> extends EventEmitter {
  private workerPath: string;
  private options: Required<WorkerPoolOptions>;
  private workers: PoolWorker[] = [];
  private taskQueue: WorkerTask<TInput, TOutput>[] = [];
  private taskCounter = 0;
  private destroyed = false;

  constructor(workerPath: string, options: WorkerPoolOptions = {}) {
    super();
    this.workerPath = workerPath;
    this.options = {
      maxWorkers: options.maxWorkers ?? 4,
      minWorkers: options.minWorkers ?? 1,
      idleTimeout: options.idleTimeout ?? 30000, // 30 seconds
    };

    // Pre-create minimum workers
    for (let i = 0; i < this.options.minWorkers; i++) {
      this.createWorker();
    }
  }

  /**
   * Create a new worker instance
   */
  private createWorker(): PoolWorker {
    const worker = new Worker(this.workerPath);
    const poolWorker: PoolWorker = {
      worker,
      busy: false,
    };

    worker.on('error', error => {
      log.error('[WorkerPool] Worker error:', error);
      this.handleWorkerError(poolWorker, error);
    });

    worker.on('exit', code => {
      if (code !== 0) {
        log.warn(`[WorkerPool] Worker stopped with exit code ${code}`);
      }
      this.removeWorker(poolWorker);
    });

    this.workers.push(poolWorker);
    log.debug(`[WorkerPool] Created worker (total: ${this.workers.length})`);

    return poolWorker;
  }

  /**
   * Get an available worker or create a new one
   */
  private getAvailableWorker(): PoolWorker | null {
    // Find idle worker
    const idleWorker = this.workers.find(w => !w.busy);
    if (idleWorker) {
      // Clear idle timeout
      if (idleWorker.idleTimer) {
        clearTimeout(idleWorker.idleTimer);
        idleWorker.idleTimer = undefined;
      }
      return idleWorker;
    }

    // Create new worker if below max
    if (this.workers.length < this.options.maxWorkers) {
      return this.createWorker();
    }

    // All workers busy and at max capacity
    return null;
  }

  /**
   * Execute a task in a worker
   */
  private executeTask(task: WorkerTask<TInput, TOutput>, poolWorker: PoolWorker): void {
    poolWorker.busy = true;

    const handleMessage = (message: unknown): void => {
      const msg = message as { type: string; [key: string]: unknown };

      if (msg.type === 'progress' && task.onProgress) {
        task.onProgress(msg);
      } else if (msg.type === 'result') {
        cleanup();
        poolWorker.busy = false;
        task.resolve(msg as TOutput);
        this.scheduleIdleTimeout(poolWorker);
        this.processQueue();
      } else if (msg.type === 'error') {
        cleanup();
        poolWorker.busy = false;
        const error = new Error((msg.error as string) || 'Worker error');
        if (msg.stack) {
          error.stack = msg.stack as string;
        }
        task.reject(error);
        this.scheduleIdleTimeout(poolWorker);
        this.processQueue();
      }
    };

    const handleError = (error: Error): void => {
      cleanup();
      poolWorker.busy = false;
      task.reject(error);
      this.scheduleIdleTimeout(poolWorker);
      this.processQueue();
    };

    const cleanup = (): void => {
      poolWorker.worker.off('message', handleMessage);
      poolWorker.worker.off('error', handleError);
    };

    poolWorker.worker.on('message', handleMessage);
    poolWorker.worker.on('error', handleError);
    poolWorker.worker.postMessage(task.input);
  }

  /**
   * Schedule idle timeout for a worker
   */
  private scheduleIdleTimeout(poolWorker: PoolWorker): void {
    // Don't timeout minimum workers
    if (this.workers.length <= this.options.minWorkers) {
      return;
    }

    poolWorker.idleTimer = setTimeout(() => {
      if (!poolWorker.busy) {
        log.debug('[WorkerPool] Terminating idle worker');
        this.removeWorker(poolWorker);
      }
    }, this.options.idleTimeout);
  }

  /**
   * Process the next task in queue
   */
  private processQueue(): void {
    if (this.destroyed || this.taskQueue.length === 0) {
      return;
    }

    const worker = this.getAvailableWorker();
    if (worker) {
      const task = this.taskQueue.shift()!;
      this.executeTask(task, worker);
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(poolWorker: PoolWorker, error: Error): void {
    // Find and reject any task that might have been running
    poolWorker.busy = false;
    this.emit('workerError', error);
  }

  /**
   * Remove a worker from the pool
   */
  private removeWorker(poolWorker: PoolWorker): void {
    const index = this.workers.indexOf(poolWorker);
    if (index !== -1) {
      this.workers.splice(index, 1);
      poolWorker.worker.terminate();
      if (poolWorker.idleTimer) {
        clearTimeout(poolWorker.idleTimer);
      }
      log.debug(`[WorkerPool] Removed worker (total: ${this.workers.length})`);
    }
  }

  /**
   * Run a task in the worker pool
   *
   * @param input - Input data for the worker
   * @param onProgress - Optional progress callback
   * @returns Promise that resolves with the worker's result
   */
  async runTask(input: TInput, onProgress?: (progress: unknown) => void): Promise<TOutput> {
    if (this.destroyed) {
      throw new Error('Worker pool has been destroyed');
    }

    return new Promise<TOutput>((resolve, reject) => {
      const task: WorkerTask<TInput, TOutput> = {
        id: `task-${++this.taskCounter}`,
        input,
        resolve,
        reject,
        onProgress,
      };

      // Try to execute immediately
      const worker = this.getAvailableWorker();
      if (worker) {
        this.executeTask(task, worker);
      } else {
        // Queue for later
        this.taskQueue.push(task);
        log.debug(`[WorkerPool] Task queued (queue length: ${this.taskQueue.length})`);
      }
    });
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queuedTasks: number;
  } {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      idleWorkers: this.workers.length - busyWorkers,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Destroy the worker pool and terminate all workers
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker pool destroyed'));
    }
    this.taskQueue = [];

    // Terminate all workers
    for (const poolWorker of this.workers) {
      if (poolWorker.idleTimer) {
        clearTimeout(poolWorker.idleTimer);
      }
      poolWorker.worker.terminate();
    }
    this.workers = [];

    log.info('[WorkerPool] Destroyed');
  }
}
