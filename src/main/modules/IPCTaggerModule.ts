import { ipcMain } from 'electron';
import log from 'electron-log';

import channels from '../../preload/lib/ipc-channels';
import { Track } from '../../preload/types/harmony';
import {
  FindCandidates,
  FixTags,
  ApplyTagSelections,
  AutoApplyProgressCallback,
  AutoApplyCompleteCallback,
} from '../lib/tagger/tagger';
import { SearchSimilars } from '../lib/track/similar';

import ModuleWindow from './BaseWindowModule';
import { TrackCandidatesResult, TrackSelection, TagCandidatesProgress } from '@preload/types/tagger';
import { getTaggerWorkerManager } from '../lib/tagger/worker/tagger-worker-manager';
import ConfigModule from './ConfigModule';

/**
 * Module in charge of returning the track with tags fixed.
 * Manages tagger worker lifecycle and emits progress events during candidate searches.
 *
 * AIDEV-NOTE: Accepts ConfigModule to read taggerConfig (enabled providers, priority, maxResults).
 * Re-initializes workers when the user changes taggerConfig from the Settings > Tagger panel.
 */
class IPCTaggerModule extends ModuleWindow {
  private configModule: ConfigModule;

  constructor(window: Electron.BrowserWindow, configModule: ConfigModule) {
    super(window);
    this.configModule = configModule;
  }

  async load(): Promise<void> {
    // Initialize tagger workers using the configured providers
    try {
      const taggerConfig = this.configModule.getConfig().get('taggerConfig');
      const taggerManager = getTaggerWorkerManager();
      await taggerManager.initialize(taggerConfig?.providers);
      log.info('[IPCTaggerModule] Tagger workers initialized successfully');
    } catch (error) {
      log.error('[IPCTaggerModule] Failed to initialize tagger workers:', error);
    }

    // AIDEV-NOTE: Listen for CONFIG_SET to detect when the user changes taggerConfig
    // from Settings > Tagger. Re-initialize workers to reflect the new provider set.
    ipcMain.on(channels.CONFIG_SET, async (_e, key: string) => {
      if (key === 'taggerConfig') {
        try {
          const taggerConfig = this.configModule.getConfig().get('taggerConfig');
          log.info('[IPCTaggerModule] taggerConfig changed — re-initializing workers...');
          const taggerManager = getTaggerWorkerManager();
          await taggerManager.reinitialize(taggerConfig?.providers ?? []);
          log.info('[IPCTaggerModule] Tagger workers re-initialized successfully');
        } catch (error) {
          log.error('[IPCTaggerModule] Failed to re-initialize tagger workers after config change:', error);
        }
      }
    });

    ipcMain.handle(channels.FIX_TAGS, (_e, track: Track): Promise<Track> => {
      return FixTags(track);
    });

    // Handler with progress callback to report advances to renderer
    ipcMain.handle(
      channels.FIND_TAG_CANDIDATES,
      (_e, tracks: Track[], options?: { autoApply?: boolean }): Promise<TrackCandidatesResult[]> => {
        // Read current taggerConfig for this search
        const taggerConfig = this.configModule.getConfig().get('taggerConfig');

        // Emit search progress to renderer
        const onProgress = (progress: TagCandidatesProgress) => {
          this.window.webContents.send(channels.TAG_CANDIDATES_PROGRESS, progress);
        };

        // Emit auto-apply progress in background
        const onAutoApplyProgress: AutoApplyProgressCallback = progress => {
          this.window.webContents.send(channels.TAG_AUTO_APPLY_COMPLETE, {
            type: 'progress',
            ...progress,
          });
        };

        // Emit auto-apply complete event
        const onAutoApplyComplete: AutoApplyCompleteCallback = result => {
          log.info(
            `[IPCTaggerModule] Auto-apply completed: ${result.updated} updated, ${result.failed} failed, trackIds: ${result.trackIds.join(', ')}`,
          );
          this.window.webContents.send(channels.TAG_AUTO_APPLY_COMPLETE, {
            type: 'complete',
            ...result,
          });
        };

        return FindCandidates(
          tracks,
          onProgress,
          onAutoApplyProgress,
          onAutoApplyComplete,
          options,
          taggerConfig?.providers,
        );
      },
    );

    ipcMain.handle(
      channels.APPLY_TAG_SELECTIONS,
      async (
        _e,
        selections: TrackSelection[],
        tracks: Track[],
      ): Promise<{ updated: Track[]; errors: Array<{ trackId: string; error: string }> }> => {
        return ApplyTagSelections(selections, tracks);
      },
    );

    // AIDEV-NOTE: Handler for finding similar tracks from Beatport API
    ipcMain.handle(channels.TRACK_FIND_SIMILARS, async (_e, bpTrackId: number): Promise<any> => {
      try {
        log.info(`[IPCTaggerModule] Finding similar tracks for Beatport track ID: ${bpTrackId}`);
        const results = await SearchSimilars(bpTrackId);
        log.info(`[IPCTaggerModule] Found ${results?.length || 0} similar tracks`);
        return results;
      } catch (error) {
        log.error('[IPCTaggerModule] Error finding similar tracks:', error);
        throw error;
      }
    });
  }

  async unload(): Promise<void> {
    try {
      const taggerManager = getTaggerWorkerManager();
      await taggerManager.shutdown();
      log.info('[IPCTaggerModule] Tagger workers shut down successfully');
    } catch (error) {
      log.error('[IPCTaggerModule] Error shutting down tagger workers:', error);
    }
  }
}

export default IPCTaggerModule;
