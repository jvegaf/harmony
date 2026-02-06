import type { MessageBoxReturnValue } from 'electron';
import { TrackEditableFields, Track, TrackId, TrackSrc } from '../../../preload/types/harmony';
import { TrackSelection } from '../../../preload/types/tagger';
import { stripAccents } from '../../../preload/lib/utils-id3';
import { chunk } from '../../../preload/lib/utils';

import { createStore } from './store-helpers';
import usePlayerStore from './usePlayerStore';
import router from '../views/router';
import { TrackCandidatesResult } from '@preload/types/tagger';
import { GetFilenameWithoutExtension } from '@renderer/lib/utils-library';

const { db, config, covers, logger, library, dialog, playlists } = window.Main;

type LibraryState = {
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
  api: {
    openHandler: (opts: Electron.OpenDialogOptions) => Promise<void>;
    search: (value: string) => void;
    setSearched: (trackSearched: Track | null) => void;
    add: (pathsToScan: string[]) => Promise<void>;
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
  },
  tagsApplying: false,
  tagsApplyProgress: {
    processed: 0,
    total: 0,
  },
  tracklistSort: initialTracklistSort,
  renamingPlaylist: null,
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
    setSearched: (trackSearched: Track | null) => set({ searched: trackSearched }),
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

        // AIDEV-NOTE: Import playlists from M3U files found
        if (supportedPlaylistsFiles.length > 0) {
          logger.info(`Found ${supportedPlaylistsFiles.length} playlist files, importing...`);

          for (const playlistPath of supportedPlaylistsFiles) {
            try {
              // Resolve M3U playlist to get track paths
              const trackPaths = await playlists.resolveM3U(playlistPath);

              if (trackPaths.length === 0) {
                logger.warn(`Playlist ${playlistPath} has no valid tracks`);
                continue;
              }

              // Find tracks in database by path
              const playlistTracks = await db.tracks.findByPath(trackPaths);

              if (playlistTracks.length === 0) {
                logger.warn(`No tracks in database for playlist ${playlistPath}`);
                continue;
              }

              // Create playlist with name from file
              const playlistName = playlistPath.split(/[\\/]/).pop()?.replace('.m3u', '') || 'Imported Playlist';

              logger.info(`Creating playlist "${playlistName}" with ${playlistTracks.length} tracks`);

              // Use PlaylistsAPI to create the playlist
              const PlaylistsAPI = (await import('./PlaylistsAPI')).default;
              await PlaylistsAPI.create(playlistName, playlistTracks, false);
            } catch (err) {
              logger.error(`Error importing playlist ${playlistPath}:`, err as any);
            }
          }
        }

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
          candidatesSearchProgress: { processed: 0, total: tracks.length },
        });

        logger.info(`Starting candidate search for ${tracks.length} tracks`);

        // Llamar a la API (que procesa internamente todos los tracks)
        const trkCandidates = await library.findTagCandidates(tracks);

        // Marcar como completado
        set({
          candidatesSearching: false,
          candidatesSearchProgress: { processed: tracks.length, total: tracks.length },
          trackTagsCandidates: trkCandidates,
          tagsSelecting: true,
        });

        logger.info(`Candidate search completed: ${trkCandidates.length} results`);
      } catch (err) {
        logger.error('Error finding candidates:', err as any);
        set({
          candidatesSearching: false,
          candidatesSearchProgress: { processed: 0, total: 0 },
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

        // Revalidar el router para refrescar toda la lista
        router.revalidate();

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
  },
}));

export default useLibraryStore;

export function useLibraryAPI() {
  return useLibraryStore(state => state.api);
}
