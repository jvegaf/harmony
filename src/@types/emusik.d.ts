import { Dispatch, SetStateAction } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';

export type AppContextType = {
  tracks: Track[];
  setTracks: Dispatch<SetStateAction<Track[]>>;
  trackDetail: TrackId | null;
  setTrackDetail: Dispatch<SetStateAction<TrackId>>;
  trackPlaying: TrackId | null;
  setTrackPlaying: Dispatch<SetStateAction<TrackId>>;
};
