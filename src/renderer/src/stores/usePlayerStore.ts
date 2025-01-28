import { create } from 'zustand';

import { PlayerStatus, Track, TrackId } from '../../../preload/types/harmony';
import { debounce } from 'lodash';
import { createStore } from './store-helpers';
import createSelectors from './selectors';

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
    setOutputDevice: (deviceId: string) => void;
  };
};

const { db, config, logger } = window.Main;

const playerStore = createStore<PlayerState>((set, get) => ({
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

        // player.setTrack(track);
        // await player.play();

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
      // await player.play();

      set({ playerStatus: PlayerStatus.PLAY });
    },

    pause: (): void => {
      // player.pause();

      set({ playerStatus: PlayerStatus.PAUSE });
    },

    togglePlayPause: async () => {
      const playerAPI = get().api;
      const { playerStatus } = get();
      // const { paused } = player.getAudio();

      if (playerStatus === PlayerStatus.STOP) {
        return;
      }

      if (playerStatus === PlayerStatus.PLAY) {
        playerAPI.pause();
      } else {
        playerAPI.play();
      }
    },

    previous: async (): Promise<void> => {
      // if (player.getCurrentTime() > 3) {
      //   player.setCurrentTime(0);
      //   return;
      // }
      const { queue, queueCursor } = get();
      if (queueCursor > 0) {
        const cursor = queueCursor - 1;
        const track = await db.tracks.findOnlyByID(queue[cursor]);
        // player.setTrack(track);
        // await player.play();
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
        // player.setTrack(track);
        // await player.play();
        set({
          playingTrack: track,
          playerStatus: PlayerStatus.PLAY,
          queueCursor: cursor,
        });
      }
    },

    stop: (): void => {
      // player.stop();

      set({
        playerStatus: PlayerStatus.STOP,
      });
    },

    setVolume: volume => {
      // player.setVolume(volume);
      saveVolume(volume);
    },

    setMuted: async (muted = false) => {
      // if (muted) player.mute();
      // else player.unmute();

      await config.set('audioMuted', muted);
    },

    jumpTo: to => {
      // player.setCurrentTime(to);
      logger.info(`Jumping to ${to}`);
    },
    setOutputDevice: async (deviceId = 'default') => {
      if (deviceId) {
        try {
          // await player.setOutputDevice(deviceId);
          await config.set('audioOutputDevice', deviceId);
        } catch (err) {
          logger.warn(err);
        }
      }
    },
  },
}));

const usePlayerStore = createSelectors(playerStore);

export default usePlayerStore;

/**
 * Make sure we don't save audio volume to the file system too often
 */

const saveVolume = debounce(async (volume: number) => {
  await config.set('audioVolume', volume);
}, 500);

export function usePlayerAPI() {
  return playerStore(state => state.api);
}
