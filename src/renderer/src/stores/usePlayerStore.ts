import { create } from 'zustand';

import player from '../lib/player';

import { PlayerStatus, Track, TrackId } from '../../../preload/types/emusik';

type PlayerState = {
  playerStatus: PlayerStatus;
  playingTrack: Track | null;
  queue: TrackId[];
  queueCursor: number;
  api: {
    start: (queue: TrackId[], index: number) => Promise<void>;
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

const { db } = window.Main;

const usePlayerStore = create<PlayerState>((set, get) => ({
  playerStatus: PlayerStatus.STOP,
  playingTrack: null,
  queue: [],
  queueCursor: 0,

  api: {
    start: async (queue: TrackId[], index: number): Promise<void> => {
      const state = get();
      const id = queue[index];

      if (state.playingTrack?.id !== id) {
        const track = await db.tracks.findOnlyByID(id);

        player.setTrack(track);
        await player.play();

        set({
          playingTrack: track,
          playerStatus: PlayerStatus.PLAY,
          queue,
          queueCursor: index,
        });
        return;
      }
      set({
        queue,
        queueCursor: index,
      });
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

    previous: async (): Promise<void> => {
      if (player.getCurrentTime() > 3) {
        player.setCurrentTime(0);
        return;
      }
      const { queue, queueCursor } = get();
      if (queueCursor > 0) {
        const cursor = queueCursor - 1;
        const track = await db.tracks.findOnlyByID(queue[cursor]);
        player.setTrack(track);
        await player.play();
        set({
          playingTrack: track,
          playerStatus: PlayerStatus.PLAY,
          queueCursor: cursor,
        });
      }
    },

    next: async (): Promise<void> => {
      const { queue, queueCursor } = get();
      if (queueCursor < queue.length - 1) {
        const cursor = queueCursor + 1;
        const track = await db.tracks.findOnlyByID(queue[cursor]);
        player.setTrack(track);
        await player.play();
        set({
          playingTrack: track,
          playerStatus: PlayerStatus.PLAY,
          queueCursor: cursor,
        });
      }
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
