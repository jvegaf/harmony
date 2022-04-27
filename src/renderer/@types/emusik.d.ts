import { Track } from '../../shared/types/emusik';

export type AppContextType = {
  tracks: Track[];
  addTracks: (tracks: Track[]) => void;
};
