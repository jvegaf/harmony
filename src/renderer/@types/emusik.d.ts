import { Dispatch, SetStateAction } from 'react';

export type AppContextType = {
  trackDetail: TrackId | null;
  setTrackDetail: Dispatch<SetStateAction<TrackId | null>>;
  trackPlaying: TrackId | null;
  setTrackPlaying: Dispatch<SetStateAction<TrackId | null>>;
  tracksLoaded: boolean;
  setTracksLoaded: Dispatch<SetStateAction<boolean>>;
};
