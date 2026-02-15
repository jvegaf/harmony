import type { MessageBoxReturnValue } from 'electron';
import { TrackEditableFields, Track, TrackId, TrackSrc, LibraryChanges } from '../../../preload/types/harmony';
import { TrackSelection } from '../../../preload/types/tagger';
import { stripAccents } from '../../../preload/lib/utils-id3';
import { chunk } from '../../../preload/lib/utils';

import { createStore } from './store-helpers';
import usePlayerStore from './usePlayerStore';
import router from '../views/router';
import { TrackCandidatesResult } from '@preload/types/tagger';
import { GetFilenameWithoutExtension } from '@renderer/lib/utils-library';

const { db, config, covers, logger, library, dialog } = window.Main;

type LibraryState = {
  librarySourceRoot: string;
  search: string;
  searched: Track | null;
  refreshing: boolean;
  fixing: boolean;
  tagsSelecting: boolean;
  deleting: boolean;
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
  trackTagsCandidates: TrackCandidatesResult[] | null;
  candidatesSearching: boolean;
  candidatesSearchProgress: {
    processed: number;
    total: number;
    currentTrackTitle: string; // AIDEV-NOTE: Título del track siendo procesado
  };
  tagsApplying: boolean;
  tagsApplyProgress: {
    processed: number;
    total: number;
  };
  tracklistSort: {
    colId: string;
    mode: string;
  };
  renamingPlaylist: string | null;
  checking: boolean; // AIDEV-NOTE: true while checking library changes
  libraryChanges: LibraryChanges | null; // AIDEV-NOTE: result of library changes scan
  applyingChanges: boolean; // AIDEV-NOTE: true while applying changes
  applyChangesProgress: {
    processed: number;
    total: number;
  };
  api: {
    openHandler: (opts: Electron.OpenDialogOptions) => Promise<void>;
    search: (value: string) => void;
    setSearched: (trackSearched: Track | null) => void;
    setLibrarySourceRoot: (pathsToScan: string[]) => Promise<void>;
    remove: (trackIDs: TrackId[]) => Promise<void>;
    reset: () => Promise<void>;
    refresh: () => Promise<void>;
    updateTrackMetadata: (trackID: string, newFields: TrackEditableFields) => Promise<void>;
    highlightPlayingTrack: (highlight: boolean) => void;
    getCover: (track: Track) => Promise<string | null>;
    findCandidates: (tracks: Track[]) => Promise<void>;
    setTagCandidates: (candidates: TrackCandidatesResult[] | null) => void;
    applyTrackTagsSelections: (selections: TrackSelection[]) => Promise<void>;
    fixTrack: (trackID: string) => Promise<void>;
    toFix: (total: number) => void;
    updateTrackRating: (trackSrc: TrackSrc, rating: number) => Promise<void>;
    deleteTracks: (tracks: Track[]) => Promise<void>;
    setTracklistSort: (colId: string, mode: string) => Promise<void>;
    filenameToTags: (tracks: Track[]) => Promise<void>;
    setRenamingPlaylist: (playlistID: string | null) => void;
    checkLibraryChanges: () => Promise<void>;
    applyLibraryChanges: (changes: LibraryChanges) => Promise<void>;
    dismissLibraryChanges: () => void;
  };
};

const filenameToTag = (track: Track) => {
  const filename = GetFilenameWithoutExtension(track.path);
  const parts = filename.split(' - ');
  if (parts.length < 2) return track;
  return { ...track, title: parts[1], artist: parts[0] };
};

// See docs/aidev-notes/tracklist-sorting.md for details on sort persistence
const initialTracklistSort = config.__initialConfig.tracklistSort || { colId: 'path', mode: 'desc' };

const useLibraryStore = createStore<LibraryState>((set, get) => ({
  librarySourceRoot: '',
  search: '',
  searched: null,
  refreshing: false,
  fixing: false,
  tagsSelecting: false,
  deleting: false,
  refresh: {
    processed: 0,
    total: 0,
  },
  updated: null,
  fix: {
    processed: 0,
    total: 0,
  },
  highlightPlayingTrack: false,
  trackTagsCandidates: null,
  candidatesSearching: false,
  candidatesSearchProgress: {
    processed: 0,
    total: 0,
    currentTrackTitle: '',
  },
  tagsApplying: false,
  tagsApplyProgress: {
    processed: 0,
    total: 0,
  },
  tracklistSort: initialTracklistSort,
  renamingPlaylist: null,
  checking: false,
  libraryChanges: null,
  applyingChanges: false,
  applyChangesProgress: {
    processed: 0,
    total: 0,
  },
  api: {
    openHandler: async (opts: Electron.OpenDialogOptions) => {
      const paths = await dialog.open(opts);
      if (paths.length) {
        get().api.setLibrarySourceRoot(paths);
      }
    },
    /**
     * Filter tracks by search
     */
    search: (search): void => {
      set({ search: stripAccents(search) });
    },
    setSearched: (trackSearched: Track | null) => set({ searched: trackSearched }),
    /**
     * Add tracks to Library
     */
    setLibrarySourceRoot: async (pathsToScan): Promise<void> => {
      set({ refreshing: true });
      logger.info(`Adding tracks to library: ${pathsToScan.length} paths`);

      try {
        // Get all valid track paths
        // TODO move this whole function to main process
        const supportedTrackFiles = await library.scanPaths(pathsToScan);

        if (supportedTrackFiles.length === 0) {
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
        set({ librarySourceRoot: pathsToScan[0] });
        logger.info(`setting library source root to ${pathsToScan[0]}`);

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

        // Save the library path to config for future change detection
        await config.set('libraryPath', pathsToScan[0]);
        logger.info(`Saved library path to config: ${pathsToScan[0]}`);

        return;
      } catch (err: any) {
        logger.error(err);
        return;
      } finally {
        set({
          refreshing: false,
          refresh: { processed: 0, total: 0 },
          librarySourceRoot: '',
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
          set({ refreshing: false, librarySourceRoot: '' });
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
      let track = await db.tracks.findOnlyByID(trackID);

      track = {
        ...track,
        ...newFields,
      };

      if (!track) {
        throw new Error('No track found while trying to update track metadata');
      }

      await library.updateMetadata(track);
      await db.tracks.update(track);
      set({ updated: track });
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
    findCandidates: async (tracks: Track[]): Promise<void> => {
      try {
        set({
          candidatesSearching: true,
          candidatesSearchProgress: { processed: 0, total: tracks.length, currentTrackTitle: '' },
        });

        logger.info(`Starting candidate search for ${tracks.length} tracks`);

        // Llamar a la API (que procesa internamente todos los tracks)
        const trkCandidates = await library.findTagCandidates(tracks);

        // AIDEV-NOTE: Si no hay candidatos manuales (todos fueron perfect matches >= 0.9),
        // no mostrar modal de selección. El renderer escuchará TAG_AUTO_APPLY_COMPLETE
        // para mostrar progreso y actualizar la UI cuando los perfect matches terminen.
        if (trkCandidates.length === 0) {
          logger.info('All tracks were perfect matches (>= 90%) - auto-applied in background');
          set({
            candidatesSearching: false,
            candidatesSearchProgress: { processed: tracks.length, total: tracks.length, currentTrackTitle: '' },
            trackTagsCandidates: null,
            tagsSelecting: false, // No mostrar modal
          });
          return;
        }

        // Marcar como completado con candidatos para selección manual
        set({
          candidatesSearching: false,
          candidatesSearchProgress: { processed: tracks.length, total: tracks.length, currentTrackTitle: '' },
          trackTagsCandidates: trkCandidates,
          tagsSelecting: true,
        });

        logger.info(`Candidate search completed: ${trkCandidates.length} results`);
      } catch (err) {
        logger.error('Error finding candidates:', err as any);
        set({
          candidatesSearching: false,
          candidatesSearchProgress: { processed: 0, total: 0, currentTrackTitle: '' },
        });
      }
    },
    setTagCandidates: (candidates: TrackCandidatesResult[] | null) => {
      set({ trackTagsCandidates: candidates, tagsSelecting: candidates !== null });
    },
    applyTrackTagsSelections: async (selections: TrackSelection[]) => {
      try {
        logger.info(`Applying Tags selections for ${selections.length} tracks`);

        // Filtrar selecciones válidas (con candidato seleccionado)
        const validSelections = selections.filter(s => s.selected_candidate_id !== null);

        if (validSelections.length === 0) {
          logger.info('No valid selections to apply');
          set({ tagsSelecting: false, trackTagsCandidates: null });
          return;
        }

        logger.info(`Processing ${validSelections.length} valid selections`);

        set({
          tagsSelecting: false,
          trackTagsCandidates: null,
          tagsApplying: true,
          tagsApplyProgress: { processed: 0, total: validSelections.length },
        });

        // Obtener todos los tracks locales desde la base de datos
        const trackIds = validSelections.map(s => s.local_track_id);
        const tracks = await db.tracks.findByID(trackIds);

        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < validSelections.length; i++) {
          const selection = validSelections[i];
          const track = tracks.find((t: { id: string }) => t.id === selection.local_track_id);

          if (!track) {
            logger.error(`Track ${selection.local_track_id} not found`);
            totalErrors++;
            set({
              tagsApplyProgress: { processed: i + 1, total: validSelections.length },
            });
            continue;
          }

          try {
            // Aplicar tags a un solo track
            const result = await library.applyTagSelections([selection], [track]);

            // Si hubo éxito, actualizar en la BD y UI
            if (result.updated.length > 0) {
              const updatedTrack = result.updated[0];
              await db.tracks.update(updatedTrack);

              set({ updated: updatedTrack });

              totalUpdated++;
              logger.info(`[${i + 1}/${validSelections.length}] Tags applied to: ${updatedTrack.title}`);
            }

            // Log de errores si los hay
            if (result.errors.length > 0) {
              totalErrors++;
              logger.error(`[${i + 1}/${validSelections.length}] Error: ${result.errors[0].error}`);
            }
          } catch (err) {
            totalErrors++;
            logger.error(`[${i + 1}/${validSelections.length}] Exception:`, err);
          }

          // Actualizar progreso
          set({
            tagsApplyProgress: { processed: i + 1, total: validSelections.length },
          });

          // Pequeña pausa para permitir que la UI se actualice
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Finalizar
        set({
          tagsApplying: false,
          tagsApplyProgress: { processed: 0, total: 0 },
        });

        // AIDEV-NOTE: Revalidate router and navigate to recently added to show updated tracks
        router.revalidate();
        // Use window.location.hash for navigation with HashRouter
        window.location.hash = '#/recent_added';

        logger.info(
          `Tag application complete: ${totalUpdated} updated, ${totalErrors} errors, ${selections.length - validSelections.length} skipped`,
        );
      } catch (err) {
        logger.error('Error in applyTrackTagsSelections:', err as any);
        set({
          tagsSelecting: false,
          trackTagsCandidates: null,
          tagsApplying: false,
          tagsApplyProgress: { processed: 0, total: 0 },
        });
      }
    },
    fixTrack: async (trackID: string): Promise<void> => {
      let track = await db.tracks.findOnlyByID(trackID);
      const fixedTrack = await library.fixTags(track);
      track = {
        ...track,
        ...fixedTrack,
      };
      await db.tracks.update(track);
      const fixed = get().fix.processed + 1;
      const totalToFix = get().fix.total;

      set({
        fix: { processed: get().fix.processed + 1, total: get().fix.total },
        updated: track,
        fixing: fixed < totalToFix,
      });
    },
    toFix: (total: number): void => {
      set({ fixing: true, fix: { processed: 0, total: total } });
    },
    updateTrackRating: async (trackSrc: TrackSrc, newRating: number): Promise<void> => {
      const track = await db.tracks.findOnlyByPath(trackSrc);
      const rate = { source: 'traktor@native-instruments.de', rating: newRating };
      const updatedTrack = { ...track, rating: rate };
      window.Main.library.updateRating({ trackSrc, rating: newRating });
      window.Main.db.tracks.update(updatedTrack);
      set({ updated: updatedTrack });
    },
    deleteTracks: async (tracks: Track[]) => {
      usePlayerStore.getState().api.stop();
      try {
        const options: Electron.MessageBoxOptions = {
          buttons: ['Cancel', 'Delete'],
          title: 'Delete tracks from disk?',
          message: 'Are you sure you want to delete tracks from disk? ',
          type: 'warning',
        };

        const result = await dialog.msgbox(options);

        if (result.response === 1) {
          set({ deleting: true });
          await db.tracks.remove(tracks.map(track => track.id));
          await library.deleteTracks(tracks);
          set({ deleting: false });
          router.revalidate();
        }
      } catch (err) {
        logger.error(err as any);
      }
    },
    setTracklistSort: async (colId: string, mode: string): Promise<void> => {
      const tracklistSort = { colId, mode };
      set({ tracklistSort });
      await config.set('tracklistSort', tracklistSort);
      logger.debug('Tracklist sort saved:', tracklistSort);
    },
    filenameToTags: async (tracks: Track[]): Promise<void> => {
      try {
        const options: Electron.MessageBoxOptions = {
          buttons: ['Cancel', 'Accept'],
          title: 'File name to tags?',
          message: 'Are you sure you want to update tags from file names? ',
          type: 'warning',
        };

        const result = await dialog.msgbox(options);

        if (result.response === 1) {
          for (const track of tracks) {
            const updatedTrack = filenameToTag(track);
            await library.updateMetadata(updatedTrack);

            // Update in database
            await db.tracks.update(updatedTrack);

            // Update UI state
            set({ updated: updatedTrack });
          }

          // Revalidate router to refresh the track list
          router.revalidate();

          logger.info(`Updated ${tracks.length} tracks from filenames`);
        }
      } catch (err) {
        logger.error(err as any);
      }
    },
    setRenamingPlaylist: (playlistID: string | null): void => {
      set({ renamingPlaylist: playlistID });
    },
    /**
     * Check for library changes comparing filesystem with database
     */
    checkLibraryChanges: async (): Promise<void> => {
      try {
        // Get library path from config
        const libraryPath = await config.get('libraryPath');

        if (!libraryPath) {
          logger.warn('No library path configured, cannot check for changes');
          const options: Electron.MessageBoxOptions = {
            buttons: ['OK'],
            title: 'No Library Path',
            message: 'Please import a music collection first before checking for changes.',
            type: 'info',
          };
          await dialog.msgbox(options);
          return;
        }

        set({ checking: true });
        logger.info(`Checking library changes for path: ${libraryPath}`);

        // Call IPC to check changes
        const changes = await library.checkChanges(libraryPath);
        logger.info(`Changes detected: ${changes.added.length} new, ${changes.removed.length} removed`);

        set({ libraryChanges: changes });
      } catch (err) {
        logger.error('Error checking library changes:', err as any);
      } finally {
        set({ checking: false });
      }
    },
    /**
     * Apply library changes (import new tracks and remove deleted ones)
     * AIDEV-NOTE: If autoFixMetadata is enabled, this will:
     * 1. Import new tracks
     * 2. Check if they have complete metadata
     * 3. Extract title/artist from filename if missing
     * 4. Search for tag candidates for tracks with incomplete metadata
     * 5. Navigate to /recent_added to show results
     */
    applyLibraryChanges: async (changes: LibraryChanges): Promise<void> => {
      try {
        set({
          applyingChanges: true,
          libraryChanges: null,
          applyChangesProgress: { processed: 0, total: changes.added.length + changes.removed.length },
        });

        logger.info(`Applying library changes: ${changes.added.length} to add, ${changes.removed.length} to remove`);

        const importedTracks: Track[] = [];

        // 1. Import new tracks (reuse existing pipeline)
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

              set({
                applyChangesProgress: {
                  processed,
                  total: changes.added.length + changes.removed.length,
                },
              });

              return insertedChunk;
            }),
          );

          // Collect all successfully imported tracks
          results.forEach(result => {
            if (result.status === 'fulfilled') {
              importedTracks.push(...result.value);
            }
          });

          logger.info(`Successfully imported ${importedTracks.length} tracks`);
        }

        // 2. Remove tracks whose files no longer exist
        if (changes.removed.length > 0) {
          logger.info(`Removing ${changes.removed.length} tracks`);
          await db.tracks.remove(changes.removed.map(t => t.id));

          set({
            applyChangesProgress: {
              processed: changes.added.length + changes.removed.length,
              total: changes.added.length + changes.removed.length,
            },
          });
        }

        // 3. Auto-fix metadata if enabled
        const autoFixEnabled = await config.get('autoFixMetadata');
        if (autoFixEnabled && importedTracks.length > 0) {
          logger.info('Auto-fix metadata is enabled, checking imported tracks...');

          // Helper: Check if track has complete metadata
          const hasCompleteMetadata = (track: Track): boolean => {
            return !!(track.title && track.artist && track.album && track.genre && track.bpm && track.initialKey);
          };

          // Helper: Check if track has at least title and artist
          const hasTitleAndArtist = (track: Track): boolean => {
            return !!(track.title && track.artist);
          };

          // Filter tracks that need metadata fixing
          let tracksNeedingFix = importedTracks.filter(t => !hasCompleteMetadata(t));

          if (tracksNeedingFix.length > 0) {
            logger.info(`Found ${tracksNeedingFix.length} tracks with incomplete metadata`);

            // Extract title/artist from filename if missing
            tracksNeedingFix = tracksNeedingFix.map(track => {
              if (!hasTitleAndArtist(track)) {
                logger.info(`Extracting title/artist from filename for: ${track.path}`);
                return filenameToTag(track);
              }
              return track;
            });

            // Update tracks in DB with extracted title/artist
            await Promise.all(tracksNeedingFix.map(track => db.tracks.update(track)));

            // Search for tag candidates
            logger.info(`Searching tag candidates for ${tracksNeedingFix.length} tracks...`);

            // Set state to show we're searching for candidates
            set({
              candidatesSearching: true,
              candidatesSearchProgress: { processed: 0, total: tracksNeedingFix.length, currentTrackTitle: '' },
            });

            try {
              const candidates = await library.findTagCandidates(tracksNeedingFix);

              // AIDEV-NOTE: Si no hay candidatos manuales (todos fueron perfect matches >= 0.9),
              // no mostrar modal de selección y navegar directamente a recent_added
              if (candidates.length === 0) {
                logger.info(
                  'Auto-fix: All tracks were perfect matches (>= 90%) - auto-applied in background. Navigating to recent_added.',
                );
                set({
                  candidatesSearching: false,
                  candidatesSearchProgress: {
                    processed: tracksNeedingFix.length,
                    total: tracksNeedingFix.length,
                    currentTrackTitle: '',
                  },
                  trackTagsCandidates: null,
                  tagsSelecting: false,
                  applyingChanges: false,
                  applyChangesProgress: { processed: 0, total: 0 },
                });

                // Navigate to recently added (perfect matches will update in background)
                router.revalidate();
                window.location.hash = '#/recent_added';
                return;
              }

              // Show tag candidates modal for user selection
              set({
                candidatesSearching: false,
                candidatesSearchProgress: {
                  processed: tracksNeedingFix.length,
                  total: tracksNeedingFix.length,
                  currentTrackTitle: '',
                },
                trackTagsCandidates: candidates,
                tagsSelecting: true,
                applyingChanges: false,
                applyChangesProgress: { processed: 0, total: 0 },
              });

              logger.info('Tag candidates ready for user selection');
              return; // Exit early - user will select candidates and then we navigate
            } catch (err) {
              logger.error('Error searching tag candidates:', err as any);
              set({
                candidatesSearching: false,
                candidatesSearchProgress: { processed: 0, total: 0, currentTrackTitle: '' },
              });
            }
          } else {
            logger.info('All imported tracks have complete metadata');
          }
        }

        // 4. Refresh UI and navigate to recently added
        router.revalidate();
        // Use window.location.hash for navigation with HashRouter
        window.location.hash = '#/recent_added';

        logger.info('Library changes applied successfully');
      } catch (err) {
        logger.error('Error applying library changes:', err as any);
      } finally {
        set({
          applyingChanges: false,
          applyChangesProgress: { processed: 0, total: 0 },
        });
      }
    },
    /**
     * Dismiss library changes modal without applying
     */
    dismissLibraryChanges: (): void => {
      set({ libraryChanges: null });
    },
  },
}));

export default useLibraryStore;

export function useLibraryAPI() {
  return useLibraryStore(state => state.api);
}
