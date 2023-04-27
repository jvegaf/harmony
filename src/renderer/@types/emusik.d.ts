import type { Dispatch, SetStateAction } from "react";
import { Track, TrackId } from "shared/types/emusik";

export type AppContextType = {
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
