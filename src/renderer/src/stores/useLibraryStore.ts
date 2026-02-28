import { TrackEditableFields, Track, TrackId, TrackSrc, LibraryChanges } from '@renderer/types/harmony';
import { OpenDialogOptions, MessageBoxOptions, MessageBoxReturnValue } from '@renderer/types/tauri-compat';
import { stripAccents } from '@renderer/lib/utils/utils-id3';
import { chunk } from 'lodash';

import { createStore } from './store-helpers';
import usePlayerStore from './usePlayerStore';
import useTaggerStore from './useTaggerStore';
import useLibraryUIStore from './useLibraryUIStore';
import router from '../views/router';
import { GetFilenameWithoutExtension } from '@renderer/lib/utils-library';
import { db, config, covers, logger, library, dialog } from '@renderer/lib/tauri-api';

type LibraryState = {
  librarySourceRoot: string;
  libraryChanges: LibraryChanges | null;
  api: {
    openHandler: (opts: OpenDialogOptions) => Promise<void>;
    search: (value: string) => void;
    setSearched: (trackSearched: Track | null) => void;
    setLibrarySourceRoot: (pathsToScan: string[]) => Promise<void>;
    remove: (trackIDs: TrackId[]) => Promise<void>;
    reset: () => Promise<void>;
    refresh: () => Promise<void>;
    updateTrackMetadata: (trackID: string, newFields: TrackEditableFields) => Promise<void>;
    getCover: (track: Track) => Promise<string | null>;
    updateTrackRating: (trackSrc: TrackSrc, rating: number) => Promise<void>;
    deleteTracks: (tracks: Track[]) => Promise<void>;
    checkLibraryChanges: () => Promise<void>;
    applyLibraryChanges: (changes: LibraryChanges) => Promise<void>;
    dismissLibraryChanges: () => void;
  };
};

// Helper: Extract title/artist from filename
const filenameToTag = (track: Track) => {
  const filename = GetFilenameWithoutExtension(track.path);
  const parts = filename.split(' - ');
  if (parts.length < 2) return track;
  return { ...track, title: parts[1], artist: parts[0] };
};

const useLibraryStore = createStore<LibraryState>((set, get) => ({
  librarySourceRoot: '',
  libraryChanges: null,
  api: {
    openHandler: async (opts: OpenDialogOptions) => {
      const paths = await dialog.open(opts);
      if (paths && Array.isArray(paths) && paths.length > 0) {
        get().api.setLibrarySourceRoot(paths);
      } else if (paths && typeof paths === 'string') {
        get().api.setLibrarySourceRoot([paths]);
      }
    },
    search: (search): void => {
      useLibraryUIStore.getState().api.setSearch(stripAccents(search));
    },
    setSearched: (trackSearched: Track | null) => {
      useLibraryUIStore.getState().api.setSearched(trackSearched);
    },
    setLibrarySourceRoot: async (pathsToScan): Promise<void> => {
      const uiStore = useLibraryUIStore.getState();
      uiStore.api.setRefreshing(true);
      logger.info(`Adding tracks to library: ${pathsToScan.length} paths`);

      const unsubscribe = library.onImportProgress(progress => {
        logger.debug('[Import Progress]', progress);

        if (progress.step === 'importing' || progress.step === 'saving') {
          uiStore.api.setRefreshProgress(progress.processed, progress.total);
        }

        if (progress.step === 'complete') {
          logger.info(progress.message);
        }

        if (progress.step === 'error') {
          logger.error(progress.message);
        }
      });

      try {
        const result = await library.importLibraryFull(pathsToScan);

        if (!result.success) {
          logger.error('Library import failed:', result.error);
          return;
        }

        logger.info(`Import complete: ${result.tracksAdded} tracks added`);

        if (pathsToScan.length > 0) {
          await config.set('libraryPath', pathsToScan[0]);
          logger.info(`Saved library path to config: ${pathsToScan[0]}`);
        }

        return;
      } catch (err: any) {
        logger.error('Library import error:', err);
        return;
      } finally {
        unsubscribe();
        uiStore.api.setRefreshing(false);
        uiStore.api.setRefreshProgress(0, 0);
        set({ librarySourceRoot: '' });
      }
    },
    remove: async trackIDs => {
      const options: MessageBoxOptions = {
        buttons: ['Cancel', 'Remove'],
        title: 'Remove tracks from library?',
        message: `Are you sure you want to remove ${trackIDs.length} element(s) from your library?`,
        type: 'warning',
      };

      const result: MessageBoxReturnValue = await dialog.msgbox(options);

      if (result.response === 1) {
        await db.tracks.remove(trackIDs);
      }
    },
    reset: async (): Promise<void> => {
      usePlayerStore.getState().api.stop();
      try {
        const options: MessageBoxOptions = {
          buttons: ['Cancel', 'Reset'],
          title: 'Reset library?',
          message: 'Are you sure you want to reset your library? All your tracks and playlists will be cleared.',
          type: 'warning',
        };

        const result = await dialog.msgbox(options);

        if (result.response === 1) {
          useLibraryUIStore.getState().api.setRefreshing(true);
          await db.reset();
          useLibraryUIStore.getState().api.setRefreshing(false);
          set({ librarySourceRoot: '' });
          router.revalidate();
        }
      } catch (err) {
        logger.error(err as any);
      }
    },
    refresh: async (): Promise<void> => {
      router.revalidate();
    },
    updateTrackMetadata: async (trackID: string, newFields: TrackEditableFields): Promise<void> => {
      const track = await db.tracks.findOnlyByID(trackID);

      if (!track) {
        throw new Error('No track found while trying to update track metadata');
      }

      const updatedTrack = {
        ...track,
        ...newFields,
      };

      await library.updateMetadata(updatedTrack);
      await db.tracks.update(updatedTrack);
      useTaggerStore.getState().api.setUpdated(updatedTrack);
    },
    getCover: async (track: Track): Promise<string | null> => {
      return await covers.getCoverAsBase64(track);
    },
    updateTrackRating: async (trackSrc: TrackSrc, newRating: number): Promise<void> => {
      const track = await db.tracks.findOnlyByPath(trackSrc);

      if (!track) {
        throw new Error('No track found while trying to update rating');
      }

      const rate = { source: 'traktor@native-instruments.de', rating: newRating };
      const updatedTrack = { ...track, rating: rate };
      library.updateRating({ trackSrc, rating: newRating });
      db.tracks.update(updatedTrack);
      useTaggerStore.getState().api.setUpdated(updatedTrack);
    },
    deleteTracks: async (tracks: Track[]) => {
      usePlayerStore.getState().api.stop();
      try {
        const options: MessageBoxOptions = {
          buttons: ['Cancel', 'Delete'],
          title: 'Delete tracks from disk?',
          message: 'Are you sure you want to delete tracks from disk? ',
          type: 'warning',
        };

        const result = await dialog.msgbox(options);

        if (result.response === 1) {
          useLibraryUIStore.getState().api.setDeleting(true);
          await db.tracks.remove(tracks.map(track => track.id));
          await library.deleteTracks(tracks);
          useLibraryUIStore.getState().api.setDeleting(false);
          router.revalidate();
        }
      } catch (err) {
        logger.error(err as any);
      }
    },
    checkLibraryChanges: async (): Promise<void> => {
      try {
        const libraryPath = await config.get('libraryPath');

        if (!libraryPath) {
          logger.warn('No library path configured, cannot check for changes');
          const options: MessageBoxOptions = {
            buttons: ['OK'],
            title: 'No Library Path',
            message: 'Please import a music collection first before checking for changes.',
            type: 'info',
          };
          await dialog.msgbox(options);
          return;
        }

        useLibraryUIStore.getState().api.setChecking(true);
        logger.info(`Checking library changes for path: ${libraryPath}`);

        const changes = await library.checkChanges(libraryPath);
        logger.info(`Changes detected: ${changes.added.length} new, ${changes.removed.length} removed`);

        set({ libraryChanges: changes });
      } catch (err) {
        logger.error('Error checking library changes:', err as any);
      } finally {
        useLibraryUIStore.getState().api.setChecking(false);
      }
    },
    applyLibraryChanges: async (changes: LibraryChanges): Promise<void> => {
      try {
        const uiStore = useLibraryUIStore.getState();
        const taggerStore = useTaggerStore.getState();

        uiStore.api.setApplyingChanges(true);
        uiStore.api.setApplyChangesProgress(0, changes.added.length + changes.removed.length);
        set({ libraryChanges: null });

        logger.info(`Applying library changes: ${changes.added.length} to add, ${changes.removed.length} to remove`);

        const importedTracks: Track[] = [];

        if (changes.added.length > 0) {
          logger.info(`Importing ${changes.added.length} new tracks`);
          const tracks: Track[] = await library.importTracks(changes.added);

          const batchSize = 100;
          const chunkedTracks = chunk(tracks, batchSize);
          let processed = 0;

          const results = await Promise.allSettled(
            chunkedTracks.map(async chunk => {
              const insertedChunk = await db.tracks.insertMultiple(chunk);
              processed += chunk.length;
              uiStore.api.setApplyChangesProgress(processed, changes.added.length + changes.removed.length);
              return insertedChunk;
            }),
          );

          results.forEach(result => {
            if (result.status === 'fulfilled') {
              importedTracks.push(...result.value);
            }
          });

          logger.info(`Successfully imported ${importedTracks.length} tracks`);
        }

        if (changes.removed.length > 0) {
          logger.info(`Removing ${changes.removed.length} tracks`);
          await db.tracks.remove(changes.removed.map(t => t.id));
          uiStore.api.setApplyChangesProgress(
            changes.added.length + changes.removed.length,
            changes.added.length + changes.removed.length,
          );
        }

        const autoFixEnabled = await config.get('autoFixMetadata');
        if (autoFixEnabled && importedTracks.length > 0) {
          logger.info('Auto-fix metadata is enabled, checking imported tracks...');

          const hasCompleteMetadata = (track: Track): boolean => {
            return !!(track.title && track.artist && track.album && track.genre && track.bpm && track.initialKey);
          };

          const hasTitleAndArtist = (track: Track): boolean => {
            return !!(track.title && track.artist);
          };

          let tracksNeedingFix = importedTracks.filter(t => !hasCompleteMetadata(t));

          if (tracksNeedingFix.length > 0) {
            logger.info(`Found ${tracksNeedingFix.length} tracks with incomplete metadata`);

            tracksNeedingFix = tracksNeedingFix.map(track => {
              if (!hasTitleAndArtist(track)) {
                logger.info(`Extracting title/artist from filename for: ${track.path}`);
                return filenameToTag(track);
              }
              return track;
            });

            await Promise.all(tracksNeedingFix.map(track => db.tracks.update(track)));

            logger.info(`Searching tag candidates for ${tracksNeedingFix.length} tracks...`);

            try {
              const candidates = await library.findTagCandidates(tracksNeedingFix);

              if (candidates.length === 0) {
                logger.info(
                  'Auto-fix: All tracks were perfect matches (>= 90%) - auto-applied in background. Navigating to recent_added.',
                );
                uiStore.api.setApplyingChanges(false);
                uiStore.api.setApplyChangesProgress(0, 0);
                router.revalidate();
                window.location.hash = '#/recent_added';
                return;
              }

              taggerStore.api.setTagCandidates(candidates);
              uiStore.api.setApplyingChanges(false);
              uiStore.api.setApplyChangesProgress(0, 0);
              logger.info('Tag candidates ready for user selection');
              return;
            } catch (err) {
              logger.error('Error searching tag candidates:', err as any);
            }
          } else {
            logger.info('All imported tracks have complete metadata');
          }
        }

        router.revalidate();
        window.location.hash = '#/recent_added';

        logger.info('Library changes applied successfully');
      } catch (err) {
        logger.error('Error applying library changes:', err as any);
      } finally {
        useLibraryUIStore.getState().api.setApplyingChanges(false);
        useLibraryUIStore.getState().api.setApplyChangesProgress(0, 0);
      }
    },
    dismissLibraryChanges: (): void => {
      set({ libraryChanges: null });
    },
  },
}));

export default useLibraryStore;

export function useLibraryAPI() {
  return useLibraryStore(state => state.api);
}
