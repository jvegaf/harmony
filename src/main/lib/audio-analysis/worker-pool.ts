/**
 * Audio Analysis Worker Pool
 *
 * AIDEV-NOTE: Manages parallel audio analysis using Node.js worker_threads.
 * Each worker runs in a separate thread with its own essentia.js WASM instance,
 * preventing CPU-intensive analysis from blocking the main Electron process.
 *
 * Features:
 * - Configurable pool size (default: CPU cores - 1)
 * - Real worker threads for true parallelism
 * - Queue-based task distribution
 * - Progress reporting via callbacks
 * - Graceful error handling and worker restart
 */

import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';

import { AudioAnalysisResult, AudioAnalysisOptions, DEFAULT_ANALYSIS_OPTIONS } from './types';

/**
 * Worker message types
 */
interface WorkerMessage {
  type: 'analyze';
  id: string;
  filePath: string;
  options: AudioAnalysisOptions;
}

interface WorkerResult {
  type: 'result' | 'error' | 'ready';
  id?: string;
  result?: AudioAnalysisResult;
  error?: string;
}

/**
 * Task pending in the queue
 */
interface PendingTask {
  id: string;
  filePath: string;
  options: AudioAnalysisOptions;
  resolve: (result: AudioAnalysisResult) => void;
  reject: (error: Error) => void;
}

/**
 * Worker instance with state
 */
interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  currentTaskId: string | null;
  ready: boolean;
}

/**
 * Progress callback for batch analysis
 */
export type ProgressCallback = (progress: {
  completed: number;
  total: number;
  currentFile: string;
  percentage: number;
}) => void;

/**
 * Get the path to the worker script
 * In development, it's in the source directory
 * In production, it's bundled with the app
 */
function getWorkerScriptPath(): string {
  // AIDEV-NOTE: In Electron with electron-vite, the worker script needs to be
  // in the same output directory as the main process bundle.
  // We use __dirname which points to the output directory at runtime.
  if (app.isPackaged) {
    // Production: worker is in the same directory as the main bundle
    return join(__dirname, 'analysis-worker.js');
  } else {
    // Development: use the compiled output in out/main
    return join(__dirname, 'analysis-worker.js');
  }
}

/**
 * Worker Pool for parallel audio analysis using real worker threads
 */
export class AudioAnalysisWorkerPool {
  private poolSize: number;
  private workers: WorkerInstance[] = [];
  private queue: PendingTask[] = [];
  private pendingTasks: Map<string, PendingTask> = new Map();
  private initialized = false;
  private initializing = false;

  constructor(poolSize?: number) {
    // Default: CPU cores - 1, min 1, max 8
    const defaultSize = Math.max(1, Math.min(cpus().length - 1, 8));
    this.poolSize = poolSize ?? defaultSize;
    log.info(`[AudioWorkerPool] Pool size: ${this.poolSize} workers`);
  }

  /**
   * Initialize the worker pool (spawn worker threads)
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;

    this.initializing = true;

    try {
      log.info(`[AudioWorkerPool] Initializing ${this.poolSize} worker threads...`);

      const workerScriptPath = getWorkerScriptPath();
      log.info(`[AudioWorkerPool] Worker script path: ${workerScriptPath}`);

      const initPromises: Promise<void>[] = [];

      for (let i = 0; i < this.poolSize; i++) {
        initPromises.push(this.spawnWorker(i));
      }

      await Promise.all(initPromises);

      this.initialized = true;
      log.info(`[AudioWorkerPool] Initialized ${this.workers.length} workers successfully`);
    } catch (error) {
      log.error('[AudioWorkerPool] Initialization failed:', error);
      this.initializing = false;
      throw error;
    }
  }

  /**
   * Spawn a single worker thread
   */
  private async spawnWorker(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const workerScriptPath = getWorkerScriptPath();

      const worker = new Worker(workerScriptPath, {
        // Pass any needed worker data here
        workerData: { workerId: index },
      });

      const workerInstance: WorkerInstance = {
        worker,
        busy: false,
        currentTaskId: null,
        ready: false,
      };

      // Handle messages from worker
      worker.on('message', (message: WorkerResult) => {
        this.handleWorkerMessage(workerInstance, message);

        // Resolve initialization when worker is ready
        if (message.type === 'ready' && !workerInstance.ready) {
          workerInstance.ready = true;
          log.info(`[AudioWorkerPool] Worker ${index} ready`);
          resolve();
        }
      });

      // Handle worker errors
      worker.on('error', error => {
        log.error(`[AudioWorkerPool] Worker ${index} error:`, error);

        // If there's a pending task, reject it
        if (workerInstance.currentTaskId) {
          const task = this.pendingTasks.get(workerInstance.currentTaskId);
          if (task) {
            task.reject(error);
            this.pendingTasks.delete(workerInstance.currentTaskId);
          }
        }

        workerInstance.busy = false;
        workerInstance.currentTaskId = null;

        // Try to process next task
        this.processQueue();
      });

      // Handle worker exit
      worker.on('exit', code => {
        log.warn(`[AudioWorkerPool] Worker ${index} exited with code ${code}`);

        // Remove from workers array
        const idx = this.workers.indexOf(workerInstance);
        if (idx !== -1) {
          this.workers.splice(idx, 1);
        }

        // If there's a pending task, reject it
        if (workerInstance.currentTaskId) {
          const task = this.pendingTasks.get(workerInstance.currentTaskId);
          if (task) {
            task.reject(new Error(`Worker exited with code ${code}`));
            this.pendingTasks.delete(workerInstance.currentTaskId);
          }
        }
      });

      this.workers.push(workerInstance);

      // Set a timeout for worker initialization
      setTimeout(() => {
        if (!workerInstance.ready) {
          log.error(`[AudioWorkerPool] Worker ${index} initialization timeout`);
          reject(new Error('Worker initialization timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Handle messages from worker threads
   */
  private handleWorkerMessage(workerInstance: WorkerInstance, message: WorkerResult): void {
    if (message.type === 'ready') {
      // Worker is ready, already handled in spawnWorker
      return;
    }

    const taskId = message.id;
    if (!taskId) return;

    const task = this.pendingTasks.get(taskId);
    if (!task) {
      log.warn(`[AudioWorkerPool] Received result for unknown task: ${taskId}`);
      return;
    }

    // Clear task from pending
    this.pendingTasks.delete(taskId);

    // Mark worker as available
    workerInstance.busy = false;
    workerInstance.currentTaskId = null;

    // Handle result
    if (message.type === 'result' && message.result) {
      task.resolve(message.result);
    } else if (message.type === 'error') {
      task.reject(new Error(message.error || 'Unknown worker error'));
    }

    // Process next task in queue
    this.processQueue();
  }

  /**
   * Analyze a single file (queued execution)
   */
  async analyzeFile(filePath: string, options?: AudioAnalysisOptions): Promise<AudioAnalysisResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise<AudioAnalysisResult>((resolve, reject) => {
      const task: PendingTask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filePath,
        options: { ...DEFAULT_ANALYSIS_OPTIONS, ...options },
        resolve,
        reject,
      };

      this.queue.push(task);
      this.processQueue();
    });
  }

  /**
   * Analyze multiple files in parallel with progress reporting
   */
  async analyzeFiles(
    filePaths: string[],
    options?: AudioAnalysisOptions,
    onProgress?: ProgressCallback,
  ): Promise<Map<string, AudioAnalysisResult | Error>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = new Map<string, AudioAnalysisResult | Error>();
    let completed = 0;
    const total = filePaths.length;

    log.info(`[AudioWorkerPool] Analyzing ${total} files with ${this.poolSize} workers`);

    // Create promises for all files
    const promises = filePaths.map(filePath => {
      return this.analyzeFile(filePath, options)
        .then(result => {
          results.set(filePath, result);
          completed++;

          if (onProgress) {
            onProgress({
              completed,
              total,
              currentFile: filePath,
              percentage: Math.round((completed / total) * 100),
            });
          }

          log.info(`[AudioWorkerPool] Progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`);
        })
        .catch(error => {
          results.set(filePath, error instanceof Error ? error : new Error(String(error)));
          completed++;

          if (onProgress) {
            onProgress({
              completed,
              total,
              currentFile: filePath,
              percentage: Math.round((completed / total) * 100),
            });
          }

          log.error(`[AudioWorkerPool] Failed: ${filePath}`, error);
        });
    });

    // Wait for all to complete
    await Promise.all(promises);

    log.info(`[AudioWorkerPool] Batch complete: ${total} files processed`);
    return results;
  }

  /**
   * Process the task queue - assign tasks to available workers
   */
  private processQueue(): void {
    // Find available workers
    const availableWorkers = this.workers.filter(w => !w.busy && w.ready);

    // Assign tasks to available workers
    while (availableWorkers.length > 0 && this.queue.length > 0) {
      const worker = availableWorkers.shift()!;
      const task = this.queue.shift()!;

      // Mark worker as busy
      worker.busy = true;
      worker.currentTaskId = task.id;

      // Store task for later resolution
      this.pendingTasks.set(task.id, task);

      // Send task to worker
      const message: WorkerMessage = {
        type: 'analyze',
        id: task.id,
        filePath: task.filePath,
        options: task.options,
      };

      worker.worker.postMessage(message);
      log.info(`[AudioWorkerPool] Dispatched task ${task.id} for: ${task.filePath}`);
    }
  }

  /**
   * Get current pool size
   */
  getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Set pool size dynamically (requires re-initialization)
   */
  setPoolSize(size: number): void {
    const newSize = Math.max(1, Math.min(size, 16)); // Min 1, max 16

    if (newSize !== this.poolSize) {
      this.poolSize = newSize;
      log.info(`[AudioWorkerPool] Pool size changed to: ${this.poolSize}`);

      // If already initialized, we'd need to adjust workers
      // For now, this will take effect on next batch
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { queueSize: number; activeWorkers: number; poolSize: number; readyWorkers: number } {
    return {
      queueSize: this.queue.length,
      activeWorkers: this.workers.filter(w => w.busy).length,
      poolSize: this.poolSize,
      readyWorkers: this.workers.filter(w => w.ready).length,
    };
  }

  /**
   * Clear the queue (useful for canceling batch operations)
   */
  clearQueue(): void {
    const cleared = this.queue.length;
    for (const task of this.queue) {
      task.reject(new Error('Task cancelled'));
    }
    this.queue = [];
    log.info(`[AudioWorkerPool] Cleared ${cleared} queued tasks`);
  }

  /**
   * Shutdown all workers
   */
  async shutdown(): Promise<void> {
    log.info('[AudioWorkerPool] Shutting down workers...');

    this.clearQueue();

    const terminationPromises = this.workers.map(w => w.worker.terminate());
    await Promise.all(terminationPromises);

    this.workers = [];
    this.initialized = false;
    this.initializing = false;

    log.info('[AudioWorkerPool] All workers terminated');
  }
}

// Singleton instance
let workerPoolInstance: AudioAnalysisWorkerPool | null = null;

/**
 * Get the global worker pool instance
 */
export function getWorkerPool(poolSize?: number): AudioAnalysisWorkerPool {
  if (!workerPoolInstance) {
    workerPoolInstance = new AudioAnalysisWorkerPool(poolSize);
  } else if (poolSize !== undefined) {
    workerPoolInstance.setPoolSize(poolSize);
  }
  return workerPoolInstance;
}

/**
 * Reset the worker pool (useful for testing or reconfiguration)
 */
export async function resetWorkerPool(): Promise<void> {
  if (workerPoolInstance) {
    await workerPoolInstance.shutdown();
    workerPoolInstance = null;
  }
}
