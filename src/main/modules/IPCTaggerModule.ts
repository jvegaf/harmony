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

import ModuleWindow from './BaseWindowModule';
import { TrackCandidatesResult, TrackSelection, TagCandidatesProgress } from '@preload/types/tagger';
import { getTaggerWorkerManager } from '../lib/tagger/worker/tagger-worker-manager';

/**
 * Module in charge of returning the track with tags fixed.
 * Manages tagger worker lifecycle and emits progress events during candidate searches.
 */
class IPCTaggerModule extends ModuleWindow {
  async load(): Promise<void> {
    // Initialize tagger workers on module load
    try {
      const taggerManager = getTaggerWorkerManager();
      await taggerManager.initialize();
      log.info('[IPCTaggerModule] Tagger workers initialized successfully');
    } catch (error) {
      log.error('[IPCTaggerModule] Failed to initialize tagger workers:', error);
    }

    ipcMain.handle(channels.FIX_TAGS, (_e, track: Track): Promise<Track> => {
      return FixTags(track);
    });

    // Handler with progress callback to report advances to renderer
    ipcMain.handle(
      channels.FIND_TAG_CANDIDATES,
      (_e, tracks: Track[], options?: { autoApply?: boolean }): Promise<TrackCandidatesResult[]> => {
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

        return FindCandidates(tracks, onProgress, onAutoApplyProgress, onAutoApplyComplete, options);
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
