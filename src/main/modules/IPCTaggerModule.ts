import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { Track } from '../../preload/types/harmony';
import { FindCandidates, FixTags, ApplyTagSelections } from '../lib/tagger/tagger';

import ModuleWindow from './BaseWindowModule';
import { TrackCandidatesResult, TrackSelection } from '@preload/types/tagger';

/**
 * Module in charge of returning the track with tags fixed
 */
class IPCTaggerModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.handle(channels.FIX_TAGS, (_e, track: Track): Promise<Track> => {
      return FixTags(track);
    });
    ipcMain.handle(channels.FIND_TAG_CANDIDATES, (_e, tracks: Track[]): Promise<TrackCandidatesResult[]> => {
      return FindCandidates(tracks);
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
