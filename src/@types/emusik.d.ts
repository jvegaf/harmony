import { Dispatch, SetStateAction } from 'react';
import { Track } from '../../electron/types/emusik';
import AudioPlayer from '../lib/audioplayer';

export type AppContextType = {
  collection: Track[];
  setCollection: Dispatch<SetStateAction<Track[]>>;
  trackDetail: Track;
  setTrackDetail: Dispatch<SetStateAction<Track>>;
  player: AudioPlayer;
};
