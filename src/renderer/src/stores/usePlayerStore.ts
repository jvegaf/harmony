import { create } from 'zustand';

import player from '../lib/player';

import { PlayerStatus, Track } from '../../../preload/types/emusik';

type PlayerState = {
  playerStatus: PlayerStatus;
  playingTrack: Track | null;
  api: {
    start: (id: string) => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    togglePlayPause: () => Promise<void>;
    previous: () => void;
    next: () => void;
    stop: () => void;
    setVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
    jumpTo: (to: number) => void;
  };
};

const { db, logger } = window.Main;

const usePlayerStore = create<PlayerState>((set, get) => ({
  playerStatus: PlayerStatus.STOP,
  playingTrack: null,

  api: {
    start: async (id): Promise<void> => {
      const state = get();

      if (state.playingTrack?.id !== id) {
        const track = await db.tracks.findOnlyByID(id);

        player.setTrack(track);
        await player.play();

        set({
          playingTrack: track,
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

      if (paused && playingTrack) {
        playerAPI.play();
      } else {
        playerAPI.pause();
      }
    },

    previous: (): void => {
      if (player.getCurrentTime() > 3) {
        player.setCurrentTime(0);
        return;
      }
      // player.previous();

      // set({
      //   playerStatus: PlayerStatus.PLAY,
      // });
    },

    next: (): void => {
      logger.info('Next track');
      // player.next();

      // set({
      //   playerStatus: PlayerStatus.PLAY,
      // });
    },

    stop: (): void => {
      player.stop();

      set({
        playerStatus: PlayerStatus.STOP,
      });
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
