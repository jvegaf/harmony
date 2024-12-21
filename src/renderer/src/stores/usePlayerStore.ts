import { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track, PlayerStatus } from '../../../preload/types/emusik';

import router from '../views/router';
import player from '../lib/player';

import { createStore } from './store-helpers';
import useLibraryStore from './useLibraryStore';

const { logger } = window.Main;

type PlayerState = {
  queue: Track[];
  oldQueue: Track[];
  queueCursor: number | null;
  queueOrigin: null | string;
  playerStatus: PlayerStatus;
  api: {
    start: (queue: Track[], id?: string) => Promise<void>;
    play: () => Promise<void>;
    pause: () => void;
    playPause: () => Promise<void>;
    stop: () => void;
    previous: () => Promise<void>;
    next: () => Promise<void>;
    setVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
    setOutputDevice: (deviceID: string) => void;
    jumpTo: (to: number) => void;
    jumpToPlayingTrack: () => Promise<void>;
    startFromQueue: (index: number) => Promise<void>;
    clearQueue: () => void;
    removeFromQueue: (index: number) => void;
    addInQueue: (tracksIDs: string[]) => Promise<void>;
    addNextInQueue: (tracksIDs: string[]) => Promise<void>;
    setQueue: (tracks: Track[]) => void;
  };
};

const usePlayerStore = createPlayerStore<PlayerState>((set, get) => ({
  queue: [], // Tracks to be played
  oldQueue: [], // Queue backup (in case of shuffle)
  queueCursor: null, // The cursor of the queue
  queueOrigin: null, // URL of the queue when it was started
  playerStatus: PlayerStatus.STOP, // Player status

  api: {
    /**
     * Start playing audio (queue instantiation, shuffle and everything...)
     * TODO: this function ~could probably~ needs to be refactored ~a bit~
     */
    start: async (queue, id): Promise<void> => {
      if (queue.length === 0) return;

      const state = get();

      let newQueue = [...queue];

      // Check if there's already a queue planned
      if (newQueue === null && state.queue !== null) {
        newQueue = state.queue;
      }

      const oldQueue = [...newQueue];
      const trackID = id || newQueue[0].id;

      // Typically, if we are in the playlists generic view without any view selected
      if (newQueue.length === 0) return;

      const queuePosition = newQueue.findIndex(track => track.id === trackID);

      // If a track exists
      if (queuePosition > -1) {
        const track = newQueue[queuePosition];

        player.setTrack(track);
        await player.play();

        const queueCursor = queuePosition; // Clean that variable mess later

        // Determine the queue origin in case the user wants to jump to the current
        // track
        const { hash } = window.location;
        const queueOrigin = hash.substring(1); // remove #

        set({
          queue: newQueue,
          queueCursor,
          queueOrigin,
          oldQueue,
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

    /**
     * Toggle play/pause
     * FIXME: how to start when player is stopped?
     */
    playPause: async () => {
      const playerAPI = get().api;
      const { queue /* , playerStatus */ } = get();
      const { paused } = player.getAudio();

      // if (playerStatus === PlayerStatus.STOP) {
      //   playerAPI.start(tracks);
      // } else
      if (paused && queue.length > 0) {
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
        queue: [],
        queueCursor: null,
        playerStatus: PlayerStatus.STOP,
      });
    },

    /**
     * Jump to the next track
     */
    next: async () => {
      const { queue, queueCursor } = get();
      let newQueueCursor: number;

      if (queueCursor !== null) {
        if (queueCursor === queue.length - 1) {
          // is last track
          newQueueCursor = 0; // start with new track
        } else {
          newQueueCursor = queueCursor + 1;
        }

        const track = queue[newQueueCursor];

        if (track !== undefined) {
          player.setTrack(track);
          await player.play();
          set({
            playerStatus: PlayerStatus.PLAY,
            queueCursor: newQueueCursor,
          });
        } else {
          get().api.stop();
        }
      }
    },

    /**
     * Jump to the previous track, or restart the current track after a certain
     * treshold
     */
    previous: async () => {
      const currentTime = player.getCurrentTime();

      const { queue, queueCursor } = get();
      let newQueueCursor = queueCursor;

      if (queueCursor !== null && newQueueCursor !== null) {
        // If track started less than 5 seconds ago, play th previous track,
        // otherwise replay the current one
        if (currentTime < 5) {
          newQueueCursor = queueCursor - 1;
        }

        const newTrack = queue[newQueueCursor];

        // tslint:disable-next-line
        if (newTrack !== undefined) {
          player.setTrack(newTrack);
          await player.play();

          set({
            playerStatus: PlayerStatus.PLAY,
            queueCursor: newQueueCursor,
          });
        } else {
          get().api.stop();
        }
      }
    },

    /**
     * Set volume
     */
    setVolume: volume => {
      player.setVolume(volume);
    },

    /**
     * Mute/unmute the audio
     */
    setMuted: async (muted = false) => {
      if (muted) player.mute();
      else player.unmute();
    },

    /**
     * Set audio's output device
     */
    setOutputDevice: async (deviceID = 'default') => {
      if (deviceID) {
        try {
          await player.setOutputDevice(deviceID);
        } catch (err) {
          logger.warn(err as any);
          // useToastsStore
          //   .getState()
          //   .api.add('danger', 'An error occured when trying to switch to the new output device');
        }
      }
    },

    /**
     * Jump to a time in the track
     */
    jumpTo: to => {
      player.setCurrentTime(to);
    },

    /**
     * Toggle play/pause
     */
    jumpToPlayingTrack: async () => {
      const queueOrigin = get().queueOrigin ?? '#/library';
      await router.navigate(queueOrigin);

      setTimeout(() => {
        useLibraryStore.getState().api.highlightPlayingTrack(true);
      }, 0);
    },

    /**
     * Start audio playback from the queue
     */
    startFromQueue: async index => {
      const { queue } = get();
      const track = queue[index];

      player.setTrack(track);
      await player.play();

      set({
        queue,
        queueCursor: index,
        playerStatus: PlayerStatus.PLAY,
      });
    },

    /**
     * Clear the queue
     */
    clearQueue: () => {
      const { queueCursor } = get();
      const queue = [...get().queue];

      if (queueCursor !== null) {
        queue.splice(queueCursor + 1, queue.length - queueCursor);

        set({
          queue,
        });
      }
    },

    /**
     * Remove track from queue
     */
    removeFromQueue: index => {
      const { queueCursor } = get();
      const queue = [...get().queue];

      if (queueCursor !== null) {
        queue.splice(queueCursor + index + 1, 1);

        set({
          queue,
        });
      }
    },

    /**
     * Add tracks at the end of the queue
     */
    addInQueue: async tracksIDs => {
      const { queue, queueCursor } = get();
      const tracks = await window.Main.db.tracks.findByID(tracksIDs);
      const newQueue = [...queue, ...tracks];

      set({
        queue: newQueue,
        // Set the queue cursor to zero if there is no current queue
        queueCursor: queue.length === 0 ? 0 : queueCursor,
      });
    },

    /**
     * Add tracks at the beginning of the queue
     */
    addNextInQueue: async tracksIDs => {
      const tracks = await window.Main.db.tracks.findByID(tracksIDs);

      const { queueCursor } = get();
      const queue = [...get().queue];

      if (queueCursor !== null) {
        queue.splice(queueCursor + 1, 0, ...tracks);
        set({
          queue,
        });
      } else {
        set({
          queue,
          queueCursor: 0,
        });
      }
    },

    /**
     * Set the queue
     */
    setQueue: (tracks: Track[]) => {
      set({
        queue: tracks,
      });
    },
  },
}));

export default usePlayerStore;

export function usePlayerAPI() {
  return usePlayerStore(state => state.api);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Special store for player
 */
function createPlayerStore<T extends PlayerState>(store: StateCreator<T>) {
  return createStore(
    persist(store, {
      name: 'emusik-player',
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error || state == null) {
            logger.error('an error happened during player store hydration');
            logger.error(error as any);
          } else {
            //  Let's set the player's src and currentTime with the info we have persisted in store
            const { queue, queueCursor } = state;
            if (queue && queueCursor) {
              const track = queue[queueCursor];
              player.setTrack(track);
            }
          }
        };
      },
      merge(persistedState, currentState) {
        if (persistedState == null) {
          persistedState = {
            palyerStatus: PlayerStatus.STOP,
          };
        }

        return {
          ...currentState,
          ...(persistedState as Partial<PlayerState>),
          // API should never be persisted
          api: currentState.api,
          // Instantiated should never be true
          instantiated: false,
          // If player status was playing, set it to pause, as it makes no sense
          // to auto-start playing a song when Harmony starts
          playerStatus:
            (persistedState as PlayerState).playerStatus === PlayerStatus.PLAY
              ? PlayerStatus.PAUSE
              : (persistedState as PlayerState).playerStatus,
        };
      },
    }),
  );
}
