/**
 * AutoSyncService
 *
 * Background synchronization service for Traktor integration.
 * Handles automatic sync based on configuration:
 * - On app startup
 * - On library changes (debounced)
 * - Manual trigger
 *
 * Runs asynchronously in the background without blocking the main thread.
 * Sends progress updates to the renderer via IPC events.
 */

import { BrowserWindow } from 'electron';
import log from 'electron-log';

import channels from '../../../../preload/lib/ipc-channels';
import type { AutoSyncStatus, TraktorConfig } from '../../../../preload/types/traktor';
import type { SyncResult } from './sync-engine';

/**
 * Callback types for sync operations
 */
export interface SyncOperations {
  executeSync: () => Promise<SyncResult>;
  exportToNml: () => Promise<void>;
  getConfig: () => TraktorConfig;
}

/**
 * AutoSyncService - Manages background synchronization with Traktor
 */
export class AutoSyncService {
  private window: BrowserWindow;
  private operations: SyncOperations;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastSyncTime: number | null = null;
  private lastError: string | null = null;
  private currentPhase: AutoSyncStatus['phase'] = undefined;
  private currentProgress = 0;
  private currentMessage = '';
  private currentDirection: 'import' | 'export' | undefined = undefined;

  constructor(window: BrowserWindow, operations: SyncOperations) {
    this.window = window;
    this.operations = operations;
  }

  /**
   * Get current auto-sync status
   */
  getStatus(): AutoSyncStatus {
    return {
      isRunning: this.isRunning,
      phase: this.currentPhase,
      progress: this.currentProgress,
      message: this.currentMessage,
      direction: this.currentDirection,
      lastSyncTime: this.lastSyncTime ?? undefined,
      lastError: this.lastError ?? undefined,
    };
  }

  /**
   * Send status update to renderer
   */
  private sendStatus(): void {
    this.window.webContents.send(channels.TRAKTOR_AUTO_SYNC_STATUS, this.getStatus());
  }

  /**
   * Update internal status and notify renderer
   */
  private updateStatus(updates: Partial<AutoSyncStatus>): void {
    if (updates.isRunning !== undefined) this.isRunning = updates.isRunning;
    if (updates.phase !== undefined) this.currentPhase = updates.phase;
    if (updates.progress !== undefined) this.currentProgress = updates.progress;
    if (updates.message !== undefined) this.currentMessage = updates.message;
    if (updates.direction !== undefined) this.currentDirection = updates.direction;
    if (updates.lastSyncTime !== undefined) this.lastSyncTime = updates.lastSyncTime;
    if (updates.lastError !== undefined) this.lastError = updates.lastError;
    this.sendStatus();
  }

  /**
   * Trigger auto-sync based on current configuration
   * Called on startup and library changes
   */
  async triggerSync(reason: 'startup' | 'library_change' | 'manual'): Promise<void> {
    const config = this.operations.getConfig();

    // Handle legacy configs that don't have autoSync property yet
    if (!config.autoSync) {
      log.debug('[AutoSync] autoSync config not found (legacy config), skipping');
      return;
    }

    // Check if auto-sync is enabled
    if (!config.autoSync.enabled) {
      log.debug('[AutoSync] Auto-sync is disabled, skipping');
      return;
    }

    // Check if NML path is configured
    if (!config.nmlPath) {
      log.debug('[AutoSync] No NML path configured, skipping');
      return;
    }

    // Check trigger conditions
    if (reason === 'startup' && !config.autoSync.onStartup) {
      log.debug('[AutoSync] Startup sync disabled, skipping');
      return;
    }

    if (reason === 'library_change' && !config.autoSync.onLibraryChange) {
      log.debug('[AutoSync] Library change sync disabled, skipping');
      return;
    }

    // If already running, skip
    if (this.isRunning) {
      log.debug('[AutoSync] Already running, skipping');
      return;
    }

    log.info(`[AutoSync] Triggering sync (reason: ${reason})`);
    await this.runSync(config.autoSync.direction);
  }

  /**
   * Trigger sync with debounce (for library changes)
   */
  triggerSyncDebounced(reason: 'library_change'): void {
    const config = this.operations.getConfig();

    // Handle legacy configs that don't have autoSync property yet
    if (!config.autoSync?.enabled || !config.autoSync?.onLibraryChange) {
      return;
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounced timer
    const debounceMs = config.autoSync?.debounceMs ?? 5000;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.triggerSync(reason);
    }, debounceMs);

    log.debug(`[AutoSync] Debounced sync scheduled (${debounceMs}ms)`);
  }

  /**
   * Run the actual sync operation
   */
  private async runSync(direction: 'import' | 'export' | 'bidirectional'): Promise<void> {
    this.updateStatus({
      isRunning: true,
      progress: 0,
      message: 'Starting auto-sync...',
      lastError: undefined,
    });

    try {
      // Import from Traktor
      if (direction === 'import' || direction === 'bidirectional') {
        this.updateStatus({
          direction: 'import',
          phase: 'syncing',
          progress: 10,
          message: 'Importing from Traktor...',
        });

        log.info('[AutoSync] Starting import from Traktor');
        const result = await this.operations.executeSync();

        const importParts: string[] = [];
        if (result.stats.tracksImported > 0) {
          importParts.push(`${result.stats.tracksImported} tracks imported`);
        }
        if (result.stats.tracksUpdated > 0) {
          importParts.push(`${result.stats.tracksUpdated} tracks updated`);
        }
        if (result.stats.cuePointsAdded > 0) {
          importParts.push(`${result.stats.cuePointsAdded} cue points`);
        }

        const importMessage = importParts.length > 0 ? importParts.join(', ') : 'No changes';
        log.info(`[AutoSync] Import complete: ${importMessage}`);

        this.updateStatus({
          progress: direction === 'bidirectional' ? 50 : 90,
          message: `Import: ${importMessage}`,
        });
      }

      // Export to Traktor
      if (direction === 'export' || direction === 'bidirectional') {
        // Check if there are pending changes before exporting
        const config = this.operations.getConfig();
        const hasPendingChanges = config.hasPendingExportChanges ?? false;

        if (!hasPendingChanges) {
          log.info('[AutoSync] No pending export changes, skipping export');
          this.updateStatus({
            progress: 95,
            message: 'No changes to export',
          });
        } else {
          this.updateStatus({
            direction: 'export',
            phase: 'writing',
            progress: direction === 'bidirectional' ? 60 : 10,
            message: 'Exporting to Traktor...',
          });

          log.info('[AutoSync] Starting export to Traktor');
          await this.operations.exportToNml();
          log.info('[AutoSync] Export complete');

          this.updateStatus({
            progress: 90,
            message: 'Export complete',
          });
        }
      }

      // Success
      this.updateStatus({
        isRunning: false,
        phase: 'complete',
        progress: 100,
        message: 'Auto-sync complete',
        lastSyncTime: Date.now(),
        direction: undefined,
      });

      log.info('[AutoSync] Sync completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('[AutoSync] Sync failed:', error);

      this.updateStatus({
        isRunning: false,
        phase: undefined,
        progress: 0,
        message: 'Auto-sync failed',
        lastError: errorMessage,
        direction: undefined,
      });
    }
  }

  /**
   * Manually start auto-sync
   */
  async start(): Promise<void> {
    await this.triggerSync('manual');
  }

  /**
   * Stop auto-sync (cancels debounced operations)
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Note: We can't cancel an in-progress sync, but we can prevent new ones
    log.info('[AutoSync] Auto-sync stopped');
  }

  /**
   * Cleanup on app shutdown
   */
  destroy(): void {
    this.stop();
  }
}
