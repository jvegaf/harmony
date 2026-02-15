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
 * Module in charge of returning the track with tags fixed
 * AIDEV-NOTE: Manages tagger worker lifecycle and emits progress events during candidate searches
 */
class IPCTaggerModule extends ModuleWindow {
  async load(): Promise<void> {
    // AIDEV-NOTE: Initialize tagger workers on module load
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

    // AIDEV-NOTE: Handler con callback de progreso para reportar avances al renderer
    ipcMain.handle(channels.FIND_TAG_CANDIDATES, (_e, tracks: Track[]): Promise<TrackCandidatesResult[]> => {
      // Callback para emitir progreso de búsqueda al renderer
      const onProgress = (progress: TagCandidatesProgress) => {
        this.window.webContents.send(channels.TAG_CANDIDATES_PROGRESS, progress);
      };

      // AIDEV-NOTE: Callback para emitir progreso del auto-apply en background
      const onAutoApplyProgress: AutoApplyProgressCallback = progress => {
        this.window.webContents.send(channels.TAG_AUTO_APPLY_COMPLETE, {
          type: 'progress',
          ...progress,
        });
      };

      // AIDEV-NOTE: Callback para emitir evento de completado del auto-apply
      const onAutoApplyComplete: AutoApplyCompleteCallback = result => {
        log.info(
          `[IPCTaggerModule] Auto-apply completed: ${result.updated} updated, ${result.failed} failed, trackIds: ${result.trackIds.join(', ')}`,
        );
        this.window.webContents.send(channels.TAG_AUTO_APPLY_COMPLETE, {
          type: 'complete',
          ...result,
        });
      };

      return FindCandidates(tracks, onProgress, onAutoApplyProgress, onAutoApplyComplete);
    });

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

  // AIDEV-NOTE: Shutdown tagger workers when module unloads
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
