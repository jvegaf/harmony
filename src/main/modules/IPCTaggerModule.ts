import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { Track } from '../../preload/types/harmony';
import { FindCandidates, FixTags, ApplyTagSelections } from '../lib/tagger/tagger';

import ModuleWindow from './BaseWindowModule';
import { TrackCandidatesResult, TrackSelection, TagCandidatesProgress } from '@preload/types/tagger';

/**
 * Module in charge of returning the track with tags fixed
 * AIDEV-NOTE: Emite eventos de progreso durante la búsqueda de candidatos
 */
class IPCTaggerModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.handle(channels.FIX_TAGS, (_e, track: Track): Promise<Track> => {
      return FixTags(track);
    });

    // AIDEV-NOTE: Handler con callback de progreso para reportar avances al renderer
    ipcMain.handle(channels.FIND_TAG_CANDIDATES, (_e, tracks: Track[]): Promise<TrackCandidatesResult[]> => {
      // Callback para emitir progreso al renderer
      const onProgress = (progress: TagCandidatesProgress) => {
        this.window.webContents.send(channels.TAG_CANDIDATES_PROGRESS, progress);
      };

      return FindCandidates(tracks, onProgress);
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
}

export default IPCTaggerModule;
