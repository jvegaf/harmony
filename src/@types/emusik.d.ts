import { Track } from '../../electron/types/emusik';
import AudioPlayer from '../lib/audioplayer';

export type AppContextType = {
  tracksCollection: Track[];
  addTrack: (track: Track) => void;
  updateTrack: (track: Track) => void;
  trackDetail: Track | null;
  setNewTrackDetail: (track: Track | null) => void;
  player: AudioPlayer;
};
