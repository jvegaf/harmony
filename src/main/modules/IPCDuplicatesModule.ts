import { ipcMain } from 'electron';

import log from 'electron-log';

import channels from '../../preload/lib/ipc-channels';
import { findDuplicates, getTrackFileInfo } from '../lib/duplicates/duplicate-finder';
import { Config } from '../../preload/types/harmony';
import type { DuplicateScanProgress, DuplicateScanResult, TrackFileInfo } from '../../preload/types/duplicates';

import ModuleWindow from './BaseWindowModule';

/**
 * IPC Module for Duplicate Finder functionality.
 * AIDEV-NOTE: Handles duplicate detection scan requests and progress reporting.
 */
export default class IPCDuplicatesModule extends ModuleWindow {
  async load(): Promise<void> {
    /**
     * Start a duplicate scan with the given configuration
     */
    ipcMain.handle(
      channels.DUPLICATES_FIND,
      async (_e, config: Config['duplicateFinderConfig']): Promise<DuplicateScanResult> => {
        log.info('[ipc-duplicates] Starting duplicate scan');

        // Send progress updates to renderer
        const onProgress = (progress: DuplicateScanProgress) => {
          this.window.webContents.send(channels.DUPLICATES_SCAN_PROGRESS, progress);
        };

        try {
          const result = await findDuplicates(config, onProgress);
          log.info(`[ipc-duplicates] Scan complete: ${result.groupCount} groups found`);
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
  }
}
