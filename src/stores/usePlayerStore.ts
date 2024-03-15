import { create } from 'zustand';

import player from '../lib/player';

import useLibraryStore from './useLibraryStore';
import { PlayerStatus } from '../../electron/types';

type PlayerState = {
  playerStatus: PlayerStatus;
  playingTrack: string;
  api: {
    start: (id: string) => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    togglePlayPause: () => Promise<void>;
    stop: () => void;
    setVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
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
          playerStatus: PlayerStatus.PLAY,
        });
      }
    },

    /**
     * Play/resume audio
     */
    play: async () => {
      await player.play();

      set({ playerStatus: PlayerStatus.PLAY });
    },

    /**
     * Pause audio
     */
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

    /**
     * Stop the player
     */
    stop: (): void => {
      player.stop();

      set({
        playerStatus: PlayerStatus.STOP,
      });
    },

    /**
     * Set volume
     */
    setVolume: (volume) => {
      player.setVolume(volume);
    },

    /**
     * Mute/unmute the audio
     */
    setMuted: async (muted = false) => {
      if (muted) player.mute();
      else player.unmute();
    },
  },
}));

export default usePlayerStore;

export function usePlayerAPI() {
  return usePlayerStore((state) => state.api);
}

