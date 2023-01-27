import { Track } from '../../electron/types/emusik';
import AudioPlayer from '../lib/audioplayer';

export type AppContextType = {
  tracksCollection: Track[];
  setNewCollection: (col: Track[]) => void;
  trackDetail: Track | null;
  setNewTrackDetail: (track: Track | null) => void;
  player: AudioPlayer;
};
