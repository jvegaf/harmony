import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { Track } from '../../preload/types/harmony';
import { FindCandidates, FixTags } from '../lib/tagger/tagger';

import ModuleWindow from './BaseWindowModule';
import { BeatportCandidate } from '../lib/tagger/beatport';

/**
 * Module in charge of returning the track with tags fixed
 */
class IPCTaggerModule extends ModuleWindow {
  async load(): Promise<void> {
    ipcMain.handle(channels.FIX_TAGS, (_e, track: Track): Promise<Track> => {
      return FixTags(track);
    });
    ipcMain.handle(channels.FIND_TAG_CANDIDATES, (_e, track: Track): Promise<BeatportCandidate[]> => {
      return FindCandidates(track);
    });
  }
}

export default IPCTaggerModule;
