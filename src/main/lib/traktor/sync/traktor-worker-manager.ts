/**
 * Traktor Worker Manager
 *
 * AIDEV-NOTE: Manages worker pool for Traktor sync and export operations.
 * Uses a shared worker pool to handle multiple concurrent operations efficiently
 * without blocking the Electron main thread.
 *
 * Usage:
 * ```typescript
 * const manager = TraktorWorkerManager.getInstance();
 *
 * // Sync operation
 * const syncResult = await manager.executeSync(nmlPath, tracks, cues, options, onProgress);
 *
 * // Export operation
 * const exportResult = await manager.executeExport(nmlPath, tracks, cues, playlists, onProgress);
 *
 * // Cleanup on app shutdown
 * manager.destroy();
 * ```
 */

import { join } from 'path';

import type { Track, Playlist } from '../../../../preload/types/harmony';
import type { CuePoint } from '../../../../preload/types/cue-point';
import type { SyncOptions, SyncResult } from './sync-engine';
import type { TraktorNML } from '../types/nml-types';
import { WorkerPool } from './worker-pool';
import type { SyncWorkerInput, SyncWorkerProgress, SyncWorkerResult } from './sync-worker';
import type { ExportWorkerInput, ExportWorkerProgress, ExportWorkerResult } from './export-worker';

/**
 * Result from sync worker with additional metadata
 */
export interface SyncWorkerExecutionResult {
  result: SyncResult;
  traktorCuesByPath: Map<string, CuePoint[]>;
  parsedNml: TraktorNML;
}

/**
 * Result from export worker
 */
export interface ExportWorkerExecutionResult {
  success: boolean;
  tracksExported: number;
  playlistsExported: number;
  backupPath?: string;
}

/**
 * Progress callback types
 */
export type SyncProgressCallback = (progress: SyncWorkerProgress) => void;
export type ExportProgressCallback = (progress: ExportWorkerProgress) => void;

/**
 * Manages worker pools for Traktor operations
 */
export class TraktorWorkerManager {
  private static instance: TraktorWorkerManager | null = null;
  private syncPool: WorkerPool<SyncWorkerInput, SyncWorkerResult>;
  private exportPool: WorkerPool<ExportWorkerInput, ExportWorkerResult>;

  private constructor() {
    // AIDEV-NOTE: Create separate pools for sync and export operations
    // This allows both operations to run concurrently without blocking each other
    const syncWorkerPath = join(__dirname, 'sync-worker.js');
    const exportWorkerPath = join(__dirname, 'export-worker.js');

    this.syncPool = new WorkerPool<SyncWorkerInput, SyncWorkerResult>(syncWorkerPath, {
      maxWorkers: 2, // Max 2 concurrent sync operations
      minWorkers: 0, // Don't keep workers alive when idle
      idleTimeout: 60000, // 1 minute
    });

    this.exportPool = new WorkerPool<ExportWorkerInput, ExportWorkerResult>(exportWorkerPath, {
      maxWorkers: 2, // Max 2 concurrent export operations
      minWorkers: 0,
      idleTimeout: 60000,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TraktorWorkerManager {
    if (!TraktorWorkerManager.instance) {
      TraktorWorkerManager.instance = new TraktorWorkerManager();
    }
    return TraktorWorkerManager.instance;
  }

  /**
   * Execute sync operation in worker thread
   *
   * @param nmlPath - Path to Traktor collection.nml file
   * @param harmonyTracks - Current tracks in Harmony database
   * @param harmonyCuesByTrackId - Current cue points grouped by track ID
   * @param options - Sync options (strategy, case sensitivity, etc.)
   * @param onProgress - Optional callback for progress updates
   * @returns Sync result with tracks to update/import
   */
  async executeSync(
    nmlPath: string,
    harmonyTracks: Track[],
    harmonyCuesByTrackId: Map<string, CuePoint[]>,
    options: SyncOptions,
    onProgress?: SyncProgressCallback,
  ): Promise<SyncWorkerExecutionResult> {
    // Serialize Map to Record for worker thread communication
    const harmonyCuesRecord: Record<string, CuePoint[]> = {};
    for (const [trackId, cues] of harmonyCuesByTrackId) {
      harmonyCuesRecord[trackId] = cues;
    }

    const input: SyncWorkerInput = {
      type: 'sync',
      nmlPath,
      harmonyTracks,
      harmonyCuesByTrackId: harmonyCuesRecord,
      options,
    };

    const result = await this.syncPool.runTask(input, onProgress);

    // Deserialize traktorCuesByPath from Record to Map
    const traktorCuesMap = new Map<string, CuePoint[]>();
    for (const [path, cues] of Object.entries(result.traktorCuesByPath)) {
      traktorCuesMap.set(path, cues);
    }

    return {
      result: result.result,
      traktorCuesByPath: traktorCuesMap,
      parsedNml: result.parsedNml,
    };
  }

  /**
   * Execute export operation in worker thread
   *
   * @param nmlPath - Path to Traktor collection.nml file
   * @param harmonyTracks - Tracks to export
   * @param harmonyCuesByTrackId - Cue points grouped by track ID
   * @param harmonyPlaylists - Playlists to export
   * @param createBackup - Whether to create a backup before writing
   * @param onProgress - Optional callback for progress updates
   * @returns Export result
   */
  async executeExport(
    nmlPath: string,
    harmonyTracks: Track[],
    harmonyCuesByTrackId: Map<string, CuePoint[]>,
    harmonyPlaylists: Playlist[],
    createBackup: boolean,
    onProgress?: ExportProgressCallback,
  ): Promise<ExportWorkerExecutionResult> {
    // Serialize Map to Record for worker thread communication
    const harmonyCuesRecord: Record<string, CuePoint[]> = {};
    for (const [trackId, cues] of harmonyCuesByTrackId) {
      harmonyCuesRecord[trackId] = cues;
    }

    const input: ExportWorkerInput = {
      type: 'export',
      nmlPath,
      harmonyTracks,
      harmonyCuesByTrackId: harmonyCuesRecord,
      harmonyPlaylists,
      createBackup,
    };

    const result = await this.exportPool.runTask(input, onProgress);

    return {
      success: result.success,
      tracksExported: result.tracksExported,
      playlistsExported: result.playlistsExported,
      backupPath: result.backupPath,
    };
  }

  /**
   * Get statistics for both pools
   */
  getStats(): {
    sync: ReturnType<WorkerPool['getStats']>;
    export: ReturnType<WorkerPool['getStats']>;
  } {
    return {
      sync: this.syncPool.getStats(),
      export: this.exportPool.getStats(),
    };
  }

  /**
   * Destroy all worker pools
   */
  destroy(): void {
    this.syncPool.destroy();
    this.exportPool.destroy();
    TraktorWorkerManager.instance = null;
  }
}
