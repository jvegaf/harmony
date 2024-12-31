/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MessageBoxReturnValue } from 'electron';
import { TrackEditableFields, Track, TrackId } from '../../../preload/types/emusik';
import { stripAccents } from '../../../preload/lib/utils-id3';
import { chunk } from '../../../preload/lib/utils';

import { createStore } from './store-helpers';
import usePlayerStore from './usePlayerStore';
import createSelectors from './selectors';

const { db, covers, logger, library, dialog } = window.Main;

type LibraryState = {
  search: string;
  refreshing: boolean;
  refresh: {
    processed: number;
    total: number;
  };
  updated: Track | null;
  fix: {
    processed: number;
    total: number;
  };
  highlightPlayingTrack: boolean;
  api: {
    openHandler: (opts: Electron.OpenDialogOptions) => Promise<void>;
    search: (value: string) => void;
    add: (pathsToScan: string[]) => Promise<void>;
    remove: (trackIDs: TrackId[]) => Promise<void>;
    reset: () => Promise<void>;
    updateTrackMetadata: (trackID: string, newFields: TrackEditableFields) => Promise<void>;
    highlightPlayingTrack: (highlight: boolean) => void;
    getCover: (track: Track) => Promise<string | null>;
    fixTrack: (trackID: string) => Promise<void>;
    toFix: (total: number) => void;
  };
};

const libraryStore = createStore<LibraryState>((set, get) => ({
  search: '',
  refreshing: false,
  refresh: {
    processed: 0,
    total: 0,
  },
  updated: null,
  fix: {
    processed: 0,
    total: 0,
  },
  highlightPlayingTrack: false, // hacky, fixme

  api: {
    openHandler: async (opts: Electron.OpenDialogOptions) => {
      const paths = await dialog.open(opts);
      if (paths.length) {
        get().api.add(paths);
      }
    },
    /**
     * Filter tracks by search
     */
    search: (search): void => {
      set({ search: stripAccents(search) });
    },
    /**
     * Add tracks to Library
     */
    add: async (pathsToScan): Promise<void> => {
      set({ refreshing: true });
      logger.info(`Adding tracks to library: ${pathsToScan.length} paths`);

      try {
        // Get all valid track paths
        // TODO move this whole function to main process
        const [supportedTrackFiles, supportedPlaylistsFiles] = await library.scanPaths(pathsToScan);

        if (supportedTrackFiles.length === 0 && supportedPlaylistsFiles.length === 0) {
          set({
            refreshing: false,
            refresh: { processed: 0, total: 0 },
          });
          return;
        }

        // 5. Import the music tracks found the directories
        const tracks: Track[] = await library.importTracks(supportedTrackFiles);

        const batchSize = 100;
        const chunkedTracks = chunk(tracks, batchSize);
        let processed = 0;

        await Promise.allSettled(
          chunkedTracks.map(async chunk => {
            logger.info(`Inserting ${chunk.length} tracks into the database`);
            // First, let's see if some of those files are already inserted
            const insertedChunk = await db.tracks.insertMultiple(chunk);
            logger.info(`Inserted ${insertedChunk.length} tracks into the database`);

            processed += batchSize;

            // Progress bar update
            set({
              refresh: {
                processed,
                total: tracks.length,
              },
            });

            return insertedChunk;
          }),
        );

        // TODO: do not re-import existing tracks

        return;
      } catch (err: any) {
        logger.error(err);
        return;
      } finally {
        set({
          refreshing: false,
          refresh: { processed: 0, total: 0 },
        });
      }
    },

    /**
     * remove tracks from library
     */
    remove: async trackIDs => {
      // not calling await on it as it calls the synchonous message box
      const options: Electron.MessageBoxOptions = {
        buttons: ['Cancel', 'Remove'],
        title: 'Remove tracks from library?',
        message: `Are you sure you want to remove ${trackIDs.length} element(s) from your library?`,
        type: 'warning',
      };

      const result: MessageBoxReturnValue = await dialog.msgbox(options);

      if (result.response === 1) {
        // button possition, here 'remove'
        // Remove tracks from the Track collection
        await db.tracks.remove(trackIDs);

        // That would be great to remove those ids from all the playlists, but it's not easy
        // and should not cause strange behaviors, all PR for that would be really appreciated
        // TODO: see if it's possible to remove the IDs from the selected state of TracksList as it "could" lead to strange behaviors
      }
    },

    /**
     * Reset the library
     */
    reset: async (): Promise<void> => {
      usePlayerStore.getState().api.stop();
      try {
        const options: Electron.MessageBoxOptions = {
          buttons: ['Cancel', 'Reset'],
          title: 'Reset library?',
          message: 'Are you sure you want to reset your library? All your tracks and playlists will be cleared.',
          type: 'warning',
        };

        const result = await dialog.msgbox(options);

        if (result.response === 1) {
          set({ refreshing: true });
          await db.reset();
          set({ refreshing: false });
        }
      } catch (err) {
        logger.error(err as any);
      }
    },

    updateTrackMetadata: async (trackID: string, newFields: TrackEditableFields): Promise<void> => {
      let track = await db.tracks.findOnlyByID(trackID);

      track = {
        ...track,
        ...newFields,
      };

      if (!track) {
        throw new Error('No track found while trying to update track metadata');
      }

      await db.tracks.update(track);
    },

    /**
     * Set highlight trigger for a track
     * FIXME: very hacky, and not great, should be done another way
     */
    highlightPlayingTrack: (highlight: boolean): void => {
      set({ highlightPlayingTrack: highlight });
    },
    getCover: async (track: Track): Promise<string | null> => {
      return await covers.getCoverAsBase64(track);
    },
    fixTrack: async (trackID: string): Promise<void> => {
      let track = await db.tracks.findOnlyByID(trackID);
      const fixedTrack = await window.Main.library.fixTags(track);
      track = {
        ...track,
        ...fixedTrack,
      };
      await db.tracks.update(track);

      set({
        fix: { processed: get().fix.processed + 1, total: get().fix.total },
        updated: track,
      });
      logger.info(`fixed ${get().fix.processed} tracks of ${get().fix.total}`);
    },
    toFix: (total: number): void => {
      set({ fix: { processed: 0, total: total } });
    },
  },
}));

const useLibraryStore = createSelectors(libraryStore);

export default useLibraryStore;

export function useLibraryAPI() {
  return libraryStore(state => state.api);
}
