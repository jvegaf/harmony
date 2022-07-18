import type { Dispatch, SetStateAction } from 'react';

export type AppContextType = {
  trackDetail: TrackId | null;
  setTrackDetail: Dispatch<SetStateAction<TrackId | null>>;
  tracksLoaded: boolean;
  setTracksLoaded: Dispatch<SetStateAction<boolean>>;
};


export type PlayerContextType = {
  trackPlaying: Track | null;
  setTrackPlaying: Dispatch<SetStateAction<Track | null>>;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  playingId: TrackId | null;
  setPlayingId: Dispatch<SetStateAction<TrackId | null>>;
};

