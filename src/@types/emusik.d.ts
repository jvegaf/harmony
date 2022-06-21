import { Dispatch, SetStateAction } from 'react';
import { Track } from '../../electron/types/emusik';

export type AppContextType = {
  tracks: Track[];
  setTracks: Dispatch<SetStateAction<Track[]>>;
  trackDetail: Track | null;
  setTrackDetail: Dispatch<SetStateAction<Track | null>>;
  trackPlaying: Track | null;
  setTrackPlaying: Dispatch<SetStateAction<Track | null>>;
};
