import {create} from 'zustand';
import type {TrackId} from '../../electron/types';

type PlayerState = {
  playingTrack: TrackId | null;
  playTrack: (trackId: TrackId) => void;
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
};

const usePlayerStore = create<PlayerState>(set => ({
  playingTrack: null,
  playTrack: (trackId: TrackId) => {
    console.log('playTrackStore:', trackId);
    set({playingTrack: trackId});
  },
  isPlaying: false,
  setIsPlaying: (value: boolean) => {
    set({isPlaying: value});
  },
}));

export default usePlayerStore;
