import { Track } from '../../electron/types/emusik';

export type LibraryContextType = {
  tracksCollection: Track[];
  addTracks: (tracks: Track[]) => void;
  updateTrack: (track: Track) => void;
};
