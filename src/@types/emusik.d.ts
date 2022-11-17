import { Dispatch, SetStateAction } from 'react';
import { Track, TrackId } from '../../electron/types/emusik';
import AudioPlayer from '../lib/audioplayer';

export type AppContextType = {
  tracks: Track[];
  setTracks: Dispatch<SetStateAction<Track[]>>;
  trackDetail: TrackId | null;
  setTrackDetail: Dispatch<SetStateAction<TrackId>>;
  player: AudioPlayer;
};
