import { PlayerStatus, Track, TrackId } from '../../../preload/types/harmony';
import { debounce } from 'lodash';
import { createStore } from './store-helpers';
import createSelectors from './selectors';

type PlayerState = {
  playerStatus: PlayerStatus;
  playingTrack: Track | null;
  queue: TrackId[];
  queueCursor: number;
  isPreCueing: boolean;
  isPruneMode: boolean;
  isMuted: boolean;
  volume: number;
  api: {
    setAudioPreCuePosition(value: number): unknown;
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
    togglePreCue: () => void;
    setPruneMode: (enabled: boolean) => void;
  };
};

const { db, config, logger } = window.Main;

const playerStore = createStore<PlayerState>((set, get) => ({
  playerStatus: PlayerStatus.STOP,
  playingTrack: null,
  queue: [],
  queueCursor: 0,
  isPreCueing: false,
  isPruneMode: false,
  isMuted: false,
  volume: 1,

  api: {
    setAudioPreCuePosition: async (value: number) => {
      // player.setAudioPreCuePosition(value);
      await config.set('audioPreCuePosition', value);
    },
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
      set({ volume });
      saveVolume(volume);
    },

    setMuted: async (muted = false) => {
      // if (muted) player.mute();
      // else player.unmute();
      set({ isMuted: muted });
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
    togglePreCue: async () => {
      const { isPreCueing } = get();

      if (isPreCueing) {
        set({ isPreCueing: false });
        return;
      }
      set({ isPreCueing: true });
    },
    setPruneMode: (enabled: boolean) => {
      set({ isPruneMode: enabled });
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
