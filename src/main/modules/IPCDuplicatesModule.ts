import { ipcMain } from 'electron';

import log from 'electron-log';

import channels from '../../preload/lib/ipc-channels';
import { findDuplicates, getTrackFileInfo } from '../lib/duplicates/duplicate-finder';
import { Config } from '../../preload/types/harmony';
import type { DuplicateScanProgress, DuplicateScanResult, TrackFileInfo } from '../../preload/types/duplicates';
import { Database } from '../lib/db/database';

import ModuleWindow from './BaseWindowModule';

// In-memory cache for duplicate scan results
let duplicatesCache: {
  result: DuplicateScanResult;
  timestamp: number;
  libraryHash: string;
  config: Config['duplicateFinderConfig'];
} | null = null;

/**
 * IPC Module for Duplicate Finder functionality.
 * AIDEV-NOTE: Handles duplicate detection scan requests, caching, and progress reporting.
 */
export default class IPCDuplicatesModule extends ModuleWindow {
  /**
   * Generate a hash of the current library state (track count + total duration)
   * AIDEV-NOTE: Simple but effective - if tracks are added/removed, hash changes
   */
  private async getLibraryHash(): Promise<string> {
    const db = Database.getInstance();
    const tracks = await db.getAllTracks();

    // Hash based on count and IDs (fast and effective)
    const trackIds = tracks
      .map(t => t.id)
      .sort()
      .join(',');
    return `${tracks.length}:${this.simpleHash(trackIds)}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cached results are still valid
   */
  private async isCacheValid(config: Config['duplicateFinderConfig']): Promise<boolean> {
    if (!duplicatesCache) return false;

    // Check if config has changed
    if (JSON.stringify(duplicatesCache.config) !== JSON.stringify(config)) {
      log.info('[ipc-duplicates] Cache invalid: config changed');
      return false;
    }

    // Check if library has changed
    const currentHash = await this.getLibraryHash();
    if (duplicatesCache.libraryHash !== currentHash) {
      log.info('[ipc-duplicates] Cache invalid: library changed');
      return false;
    }

    // Cache is valid
    const age = Date.now() - duplicatesCache.timestamp;
    log.info(`[ipc-duplicates] Cache valid (${Math.round(age / 1000)}s old)`);
    return true;
  }

  async load(): Promise<void> {
    /**
     * Start a duplicate scan with the given configuration
     * AIDEV-NOTE: Now checks cache first before scanning
     */
    ipcMain.handle(
      channels.DUPLICATES_FIND,
      async (_e, config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult> => {
        log.info('[ipc-duplicates] Starting duplicate scan');

        // Check cache first
        if (await this.isCacheValid(config)) {
          log.info('[ipc-duplicates] Returning cached results');
          return duplicatesCache!.result;
        }

        // Send progress updates to renderer
        const onProgress = (progress: DuplicateScanProgress) => {
          this.window.webContents.send(channels.DUPLICATES_SCAN_PROGRESS, progress);
        };

        try {
          const result = await findDuplicates(config, onProgress);
          log.info(`[ipc-duplicates] Scan complete: ${result.groupCount} groups found`);

          // Cache the results
          const libraryHash = await this.getLibraryHash();
          duplicatesCache = {
            result,
            timestamp: Date.now(),
            libraryHash,
            config: JSON.parse(JSON.stringify(config)), // Deep clone
          };
          log.info('[ipc-duplicates] Results cached');

          return result;
        } catch (error) {
          log.error('[ipc-duplicates] Scan failed:', error);
          throw error;
        }
      },
    );

    /**
     * Get file info for a specific track
     */
    ipcMain.handle(channels.DUPLICATES_GET_FILE_INFO, async (_e, trackId: string): Promise<TrackFileInfo> => {
      return getTrackFileInfo(trackId);
    });

    /**
     * Get cached scan results if available and valid
     */
    ipcMain.handle(
      channels.DUPLICATES_GET_CACHE,
      async (_e, config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult | null> => {
        if (await this.isCacheValid(config)) {
          log.info('[ipc-duplicates] Returning cached results');
          return duplicatesCache!.result;
        }
        return null;
      },
    );

    /**
     * Invalidate the cache (called when tracks are added/removed)
     */
    ipcMain.handle(channels.DUPLICATES_INVALIDATE_CACHE, async (): Promise<void> => {
      if (duplicatesCache) {
        log.info('[ipc-duplicates] Cache invalidated');
        duplicatesCache = null;
      }
    });
  }
}
