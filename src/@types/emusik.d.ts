import { Dispatch, SetStateAction } from 'react';
import { TrackId } from '../../electron/types/emusik';

export type AppContextType = {
  trackDetail: TrackId | null;
  setTrackDetail: Dispatch<SetStateAction<TrackId | null>>;
  trackPlaying: TrackId | null;
  setTrackPlaying: Dispatch<SetStateAction<TrackId | null>>;
};
