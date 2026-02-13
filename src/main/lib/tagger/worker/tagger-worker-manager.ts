/**
 * Tagger Worker Manager
 *
 * AIDEV-NOTE: Manages the 3 tagger workers (one per provider: Beatport, Traxsource, Bandcamp).
 * Not a generic pool - a specialized manager for the tag candidate system.
 *
 * Design:
 * - Spawns 3 workers on initialization (one per provider)
 * - Routes requests to the appropriate provider's worker
 * - Supports batch operations (process multiple tracks in parallel across all providers)
 * - Tracks pending tasks for correlation
 * - Handles worker lifecycle and cleanup
 *
 * Why not a generic pool?
 * - We always need exactly 3 workers (one per provider)
 * - Each worker is stateful (has OAuth tokens, HTTP clients)
 * - No auto-scaling or idle timeout needed (always keep alive)
 */

import { Worker as NodeWorker } from 'worker_threads';
import { join } from 'path';
import log from 'electron-log';

import { ProviderSource } from '@preload/types/tagger';
import { RawTrackData } from '../providers/types';
import { TagCandidatesProgress } from '@preload/types/tagger';

import {
  TaggerWorkerMessage,
  TaggerWorkerResult,
  TaggerWorkerData,
  WorkerInstance,
  PendingTask,
  BatchSearchRequest,
  BatchSearchResult,
  SearchPayload,
  GetDetailsPayload,
} from './types';

/**
 * Get the path to the worker script
 */
function getWorkerScriptPath(): string {
  // AIDEV-NOTE: electron-vite compiles workers to the same output directory as main bundle
  return join(__dirname, 'tagger-worker.js');
}

/**
 * Manager for tagger workers (one per provider)
 */
export class TaggerWorkerManager {
  private workers: Map<ProviderSource, WorkerInstance> = new Map();
  private pendingTasks: Map<string, PendingTask> = new Map();
  private taskIdCounter = 0;
  private initialized = false;
  private initializing = false;

  /**
   * Initialize the 3 workers (one per provider)
   */
  async initialize(): Promise<void> {
    if (this.initialized || this.initializing) return;

    this.initializing = true;

    try {
      log.info('[TaggerWorkerManager] Initializing 3 workers (Beatport, Traxsource, Bandcamp)...');

      const workerScriptPath = getWorkerScriptPath();
      log.info(`[TaggerWorkerManager] Worker script path: ${workerScriptPath}`);

      const providers: ProviderSource[] = ['beatport', 'traxsource', 'bandcamp'];
      const initPromises: Promise<void>[] = [];

      providers.forEach((provider, index) => {
        initPromises.push(this.spawnWorker(provider, index));
      });

      await Promise.all(initPromises);

      this.initialized = true;
      log.info('[TaggerWorkerManager] All workers initialized successfully');
    } catch (error) {
      log.error('[TaggerWorkerManager] Initialization failed:', error);
      this.initializing = false;
      throw error;
    }
  }

  /**
   * Spawn a worker for a specific provider
   */
  private async spawnWorker(provider: ProviderSource, workerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // AIDEV-NOTE: Prevent double-settle (timeout vs error/exit vs ready race)
      let settled = false;
      let timeoutHandle: NodeJS.Timeout | null = null;

      const safeResolve = () => {
        if (settled) return;
        settled = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve();
      };

      const safeReject = (error: Error) => {
        if (settled) return;
        settled = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(error);
      };

      const workerScriptPath = getWorkerScriptPath();

      const workerData: TaggerWorkerData = {
        providerType: provider,
        workerId,
      };

      const worker = new NodeWorker(workerScriptPath, { workerData });

      const workerInstance: WorkerInstance = {
        provider,
        worker,
        ready: false,
        busy: false,
        currentTaskId: null,
      };

      // Handle messages from worker
      worker.on('message', (message: TaggerWorkerResult) => {
        this.handleWorkerMessage(workerInstance, message);

        // Resolve initialization when worker is ready
        if (message.type === 'ready' && !workerInstance.ready) {
          workerInstance.ready = true;
          log.info(`[TaggerWorkerManager] Worker ${provider} ready`);
          safeResolve();
        }
      });

      // Handle worker errors
      worker.on('error', error => {
        log.error(`[TaggerWorkerManager] Worker ${provider} error:`, error);

        // AIDEV-NOTE: Reject spawn promise if worker crashes during initialization
        if (!workerInstance.ready) {
          safeReject(error instanceof Error ? error : new Error(String(error)));
        }

        // AIDEV-NOTE: Reject ALL pending tasks for this provider to prevent orphaned promises
        // This fixes the issue where only currentTaskId was rejected, leaving earlier tasks hanging
        const errorObj = error instanceof Error ? error : new Error(String(error));
        this.rejectAllPendingTasksForProvider(provider, errorObj);

        workerInstance.busy = false;
        workerInstance.currentTaskId = null;
      });

      // Handle worker exit
      worker.on('exit', code => {
        log.warn(`[TaggerWorkerManager] Worker ${provider} exited with code ${code}`);

        // AIDEV-NOTE: Reject spawn promise if worker exits during initialization
        if (!workerInstance.ready) {
          safeReject(new Error(`Worker ${provider} exited with code ${code} during initialization`));
        }

        // AIDEV-NOTE: Reject ALL pending tasks for this provider to prevent orphaned promises
        const exitError = new Error(`Worker ${provider} exited with code ${code}`);
        this.rejectAllPendingTasksForProvider(provider, exitError);

        // Remove from workers map
        this.workers.delete(provider);
      });

      this.workers.set(provider, workerInstance);

      // Set initialization timeout
      timeoutHandle = setTimeout(() => {
        if (!workerInstance.ready) {
          log.error(`[TaggerWorkerManager] Worker ${provider} initialization timeout`);
          safeReject(new Error(`Worker ${provider} initialization timeout`));
        }
      }, 30000); // 30 seconds
    });
  }

  /**
   * Handle messages from worker threads
   */
  private handleWorkerMessage(workerInstance: WorkerInstance, message: TaggerWorkerResult): void {
    // AIDEV-NOTE: Handle log messages from worker thread
    // Workers send log messages via parentPort to avoid electron-log import issues
    if (message.type === 'log') {
      const { level, message: logMessage, args } = message as any;
      const logFn = log[level as 'info' | 'error' | 'warn'] || log.info;
      logFn(logMessage, ...(args || []));
      return;
    }

    if (message.type === 'ready') {
      // Already handled in spawnWorker
      return;
    }

    const taskId = (message as any).id;
    if (!taskId) return;

    const task = this.pendingTasks.get(taskId);
    if (!task) {
      log.warn(`[TaggerWorkerManager] Received result for unknown task: ${taskId}`);
      return;
    }

    // Clear task from pending
    this.pendingTasks.delete(taskId);

    // Mark worker as available
    workerInstance.busy = false;
    workerInstance.currentTaskId = null;

    // Handle result
    if (message.type === 'result') {
      task.resolve((message as any).result);
    } else if (message.type === 'error') {
      const errorMsg = (message as any).error || 'Unknown worker error';
      const error = new Error(errorMsg);
      if ((message as any).stack) {
        error.stack = (message as any).stack;
      }
      task.reject(error);
    }
  }

  /**
   * Reject all pending tasks for a specific provider
   * AIDEV-NOTE: Called when a worker crashes to clean up orphaned tasks.
   * This prevents tasks from hanging forever if a worker dies mid-batch.
   */
  private rejectAllPendingTasksForProvider(provider: ProviderSource, error: Error): void {
    const tasksToReject: PendingTask[] = [];

    // Collect all tasks for this provider
    for (const [taskId, task] of this.pendingTasks.entries()) {
      if (task.provider === provider) {
        tasksToReject.push(task);
        this.pendingTasks.delete(taskId);
      }
    }

    // Reject all collected tasks
    if (tasksToReject.length > 0) {
      log.warn(`[TaggerWorkerManager] Rejecting ${tasksToReject.length} pending tasks for provider ${provider}`);
      for (const task of tasksToReject) {
        task.reject(error);
      }
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${++this.taskIdCounter}`;
  }

  /**
   * Send a message to a specific provider's worker
   */
  private async sendToWorker(provider: ProviderSource, message: TaggerWorkerMessage): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    const workerInstance = this.workers.get(provider);
    if (!workerInstance) {
      throw new Error(`Worker for provider ${provider} not found`);
    }

    if (!workerInstance.ready) {
      throw new Error(`Worker for provider ${provider} not ready`);
    }

    return new Promise((resolve, reject) => {
      const task: PendingTask = {
        id: message.id,
        provider,
        resolve,
        reject,
      };

      this.pendingTasks.set(message.id, task);
      workerInstance.busy = true;
      workerInstance.currentTaskId = message.id;
      workerInstance.worker.postMessage(message);
    });
  }

  /**
   * Search for tracks in a specific provider
   */
  async search(provider: ProviderSource, title: string, artist: string): Promise<RawTrackData[]> {
    const taskId = this.generateTaskId();
    const payload: SearchPayload = { title, artist };

    const message: TaggerWorkerMessage = {
      type: 'search',
      id: taskId,
      payload,
    };

    return this.sendToWorker(provider, message);
  }

  /**
   * Search for a single track in all providers simultaneously
   */
  async searchAll(title: string, artist: string): Promise<Map<ProviderSource, RawTrackData[]>> {
    const providers: ProviderSource[] = ['beatport', 'traxsource', 'bandcamp'];

    const searchPromises = providers.map(async provider => {
      try {
        const results = await this.search(provider, title, artist);
        return { provider, results, error: null };
      } catch (error) {
        log.error(`[TaggerWorkerManager] Search in ${provider} failed:`, error);
        return { provider, results: [], error: error instanceof Error ? error.message : String(error) };
      }
    });

    const allResults = await Promise.all(searchPromises);

    const resultMap = new Map<ProviderSource, RawTrackData[]>();
    allResults.forEach(({ provider, results }) => {
      resultMap.set(provider, results);
    });

    return resultMap;
  }

  /**
   * Search for multiple tracks in all providers (batch operation)
   *
   * AIDEV-NOTE: This is the key performance improvement. Instead of processing tracks
   * sequentially, we send all tracks to all workers at once. Each worker processes
   * its queue internally (respecting rate limits), but the 3 workers run in parallel.
   */
  async searchBatch(
    tracks: BatchSearchRequest[],
    onProgress?: (progress: TagCandidatesProgress) => void,
  ): Promise<Map<string, BatchSearchResult>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results = new Map<string, BatchSearchResult>();
    let completed = 0;
    const total = tracks.length;

    log.info(`[TaggerWorkerManager] Starting batch search for ${total} tracks...`);

    // Create search promises for all tracks x all providers
    const allPromises = tracks.map(async track => {
      const providerResults = new Map<ProviderSource, RawTrackData[]>();
      const errors = new Map<ProviderSource, string>();

      // Search in all 3 providers in parallel for this track
      const providers: ProviderSource[] = ['beatport', 'traxsource', 'bandcamp'];
      const providerPromises = providers.map(async provider => {
        try {
          const taskId = this.generateTaskId();
          const payload: SearchPayload = { title: track.title, artist: track.artist };
          const message: TaggerWorkerMessage = { type: 'search', id: taskId, payload };

          const searchResults = await this.sendToWorker(provider, message);
          providerResults.set(provider, searchResults);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          log.error(`[TaggerWorkerManager] ${provider} search failed for "${track.title}":`, errorMsg);
          errors.set(provider, errorMsg);
          providerResults.set(provider, []); // Empty results on error
        }
      });

      // Wait for all 3 providers to complete for this track
      await Promise.all(providerPromises);

      // Update progress
      completed++;
      if (onProgress) {
        onProgress({
          processed: completed,
          total,
          currentTrackTitle: track.title,
        });
      }

      log.info(`[TaggerWorkerManager] Progress: ${completed}/${total} tracks completed`);

      return {
        trackId: track.trackId,
        providerResults,
        errors,
      };
    });

    // Wait for all tracks to complete
    const allResults = await Promise.all(allPromises);

    // Build result map
    allResults.forEach(result => {
      results.set(result.trackId, result);
    });

    log.info(`[TaggerWorkerManager] Batch search complete: ${total} tracks processed`);

    return results;
  }

  /**
   * Get full track details from a specific provider
   */
  async getDetails(provider: ProviderSource, payload: GetDetailsPayload): Promise<any> {
    const taskId = this.generateTaskId();

    const message: TaggerWorkerMessage = {
      type: 'getDetails',
      id: taskId,
      payload,
    };

    return this.sendToWorker(provider, message);
  }

  /**
   * Get worker status
   */
  getStatus(): {
    initialized: boolean;
    workers: Array<{ provider: ProviderSource; ready: boolean; busy: boolean }>;
    pendingTasks: number;
  } {
    const workers = Array.from(this.workers.values()).map(w => ({
      provider: w.provider,
      ready: w.ready,
      busy: w.busy,
    }));

    return {
      initialized: this.initialized,
      workers,
      pendingTasks: this.pendingTasks.size,
    };
  }

  /**
   * Shutdown all workers
   */
  async shutdown(): Promise<void> {
    log.info('[TaggerWorkerManager] Shutting down workers...');

    // Reject all pending tasks
    for (const task of this.pendingTasks.values()) {
      task.reject(new Error('TaggerWorkerManager shutdown'));
    }
    this.pendingTasks.clear();

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(w => w.worker.terminate());
    await Promise.all(terminationPromises);

    this.workers.clear();
    this.initialized = false;
    this.initializing = false;

    log.info('[TaggerWorkerManager] All workers terminated');
  }
}

// Singleton instance
let managerInstance: TaggerWorkerManager | null = null;

/**
 * Get the global TaggerWorkerManager instance
 */
export function getTaggerWorkerManager(): TaggerWorkerManager {
  if (!managerInstance) {
    managerInstance = new TaggerWorkerManager();
  }
  return managerInstance;
}

/**
 * Reset the manager (useful for testing or reconfiguration)
 */
export async function resetTaggerWorkerManager(): Promise<void> {
  if (managerInstance) {
    await managerInstance.shutdown();
    managerInstance = null;
  }
}
