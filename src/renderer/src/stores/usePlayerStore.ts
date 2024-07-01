import { create } from 'zustand';

import player from '../lib/player';

import useLibraryStore from './useLibraryStore';
import { PlayerStatus } from '@preload/emusik-player';

type PlayerState = {
  playerStatus: PlayerStatus;
  playingTrack: string;
  api: {
    start: (id: string) => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    togglePlayPause: () => Promise<void>;
    stop: () => void;
    playNext: () => void;
    setVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
    jumpTo: (to: number) => void;
  };
};

const usePlayerStore = create<PlayerState>((set, get) => ({
  playerStatus: PlayerStatus.STOP,
  playingTrack: '',

  api: {
    start: async (id): Promise<void> => {
      const state = get();

      if (state.playingTrack !== id) {
        const track = useLibraryStore.getState().getTrackFromId(id);

        player.setTrack(track);
        await player.play();

        set({
          playingTrack: id,
          playerStatus: PlayerStatus.PLAY,
        });
      }
    },

    play: async () => {
      await player.play();

      set({ playerStatus: PlayerStatus.PLAY });
    },

    pause: (): void => {
      player.pause();

      set({ playerStatus: PlayerStatus.PAUSE });
    },

    togglePlayPause: async () => {
      const playerAPI = get().api;
      const { playingTrack } = get();
      const { paused } = player.getAudio();

      if (paused && playingTrack.length) {
        playerAPI.play();
      } else {
        playerAPI.pause();
      }
    },

    stop: (): void => {
      player.stop();

      set({
        playerStatus: PlayerStatus.STOP,
      });
    },

    playNext: (): void => {
      const playingTrack = get().playingTrack;
      const api = get().api;
      const { nextTrack } = useLibraryStore.getState();
      const newTrackId = nextTrack(playingTrack);

      api.stop();

      api.start(newTrackId);
    },

    setVolume: volume => {
      player.setVolume(volume);
    },

    setMuted: async (muted = false) => {
      if (muted) player.mute();
      else player.unmute();
    },

    jumpTo: to => {
      player.setCurrentTime(to);
    },
  },
}));

export default usePlayerStore;

export function usePlayerAPI() {
  return usePlayerStore(state => state.api);
}
