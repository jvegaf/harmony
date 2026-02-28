import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import router from '../views/router';
import makeID from '@renderer/lib/utils/id-provider';
import usePlayerStore from './usePlayerStore';
import useLibraryUIStore from './useLibraryUIStore';
import { Playlist, Track } from '@renderer/types/harmony';
import { perfLogger } from '../lib/performance-logger';
import { db, logger } from '@renderer/lib/tauri-api';

interface PlaylistsState {
  api: {
    play: (playlistID: string) => Promise<void>;
    create: (name: string, tracks?: Track[], redirect?: boolean) => Promise<string | null>;
    rename: (playlistID: string, name: string) => Promise<void>;
    remove: (playlistID: string) => Promise<void>;
    addTracks: (playlistID: string, tracks: Track[], isShown?: boolean) => Promise<void>;
    removeTracks: (playlistID: string, tracks: Track[]) => Promise<void>;
    duplicate: (playlistID: string) => Promise<void>;
    reorderTracks: (
      playlistID: string,
      tracks: Track[],
      targetTrack: Track,
      position: 'above' | 'below',
    ) => Promise<void>;
    exportToM3u: (playlistID: string) => Promise<void>;
  };
}

const usePlaylistsStore = create<PlaylistsState>()(
  devtools(
    () => ({
      api: {
        /**
         * Start playing playlist (on double click)
         */
        play: async (playlistID: string): Promise<void> => {
          try {
            const playlist = await db.playlists.findOnlyByID(playlistID);
            if (!playlist) {
              logger.warn(`Playlist ${playlistID} not found`);
              return;
            }
            const queue = playlist.tracks!.map(track => track.id);
            const index = 0;
            usePlayerStore.getState().api.start(queue, index).catch(logger.warn);
          } catch (err) {
            logger.warn((err as Error).message);
          }
        },

        /**
         * Create a new playlist
         */
        create: async (name: string, tracks: Track[] = [], redirect = false): Promise<string | null> => {
          try {
            const playlist: Playlist = {
              id: makeID(),
              name,
              tracks,
            };

            const doc = await db.playlists.insert(playlist);
            router.revalidate();
            useLibraryUIStore.getState().api.setRenamingPlaylist(doc.id);

            if (redirect) router.navigate(`/playlists/${doc.id}`);

            return doc.id;
          } catch (err: any) {
            logger.error(err);
            return null;
          }
        },

        /**
         * Rename a playlist
         */
        rename: async (playlistID: string, name: string): Promise<void> => {
          try {
            await db.playlists.rename(playlistID, name);
            router.revalidate();
          } catch (err: any) {
            logger.warn(err);
          }
        },

        /**
         * Delete a playlist
         */
        remove: async (playlistID: string): Promise<void> => {
          logger.debug('calling remove playlist api');
          try {
            // Check if user is currently viewing the playlist being deleted
            // If so, navigate away to prevent app crash due to lost reference
            const currentPath = router.state.location.pathname;
            const isViewingPlaylist = currentPath === `/playlists/${playlistID}`;

            if (isViewingPlaylist) {
              logger.info(`User is viewing playlist ${playlistID}, navigating to library before deletion`);
              await router.navigate('/');
            }

            await db.playlists.remove(playlistID);
            router.revalidate();
          } catch (err: any) {
            logger.warn(err);
          }
        },

        /**
         * Add tracks to a playlist
         */
        addTracks: async (playlistID: string, tracks: Track[], isShown?: boolean): Promise<void> => {
          // isShown should never be true, letting it here anyway to remember of a design issue
          if (isShown) return;

          try {
            const playlist = await db.playlists.findOnlyByID(playlistID);
            if (!playlist || !playlist.tracks) {
              logger.warn(`Playlist ${playlistID} not found or has no tracks`);
              return;
            }
            const playlistTracks = [...playlist.tracks, ...tracks.filter(track => !playlist.tracks!.includes(track))];
            await db.playlists.setTracks(playlistID, playlistTracks);
            router.revalidate();
          } catch (err: any) {
            logger.warn(err);
          }
        },

        /**
         * Remove tracks from a playlist
         */
        removeTracks: async (playlistID: string, tracks: Track[]): Promise<void> => {
          try {
            const playlist = await db.playlists.findOnlyByID(playlistID);
            if (!playlist || !playlist.tracks) {
              logger.warn(`Playlist ${playlistID} not found or has no tracks`);
              return;
            }
            const playlistTracks = playlist.tracks.filter((elem: Track) => !tracks.includes(elem));
            await db.playlists.setTracks(playlistID, playlistTracks);
            router.revalidate();
          } catch (err: any) {
            logger.warn(err);
          }
        },

        /**
         * Duplicate a playlist
         */
        duplicate: async (playlistID: string): Promise<void> => {
          try {
            const playlist = await db.playlists.findOnlyByID(playlistID);
            if (!playlist) {
              logger.warn(`Playlist ${playlistID} not found`);
              return;
            }
            const { tracks } = playlist;

            const newPlaylist: Playlist = {
              id: makeID(),
              name: `Copy of ${playlist.name}`,
              tracks: tracks,
            };

            await db.playlists.insert(newPlaylist);
            router.revalidate();
            useLibraryUIStore.getState().api.setRenamingPlaylist(newPlaylist.id);
          } catch (err: any) {
            logger.warn(err);
          }
        },

        /**
         * Reorder tracks in a playlist.
         * Supports reordering multiple tracks at once while preserving their relative order.
         * DEBT-005: Multi-track reordering implemented 2026-02-18
         */
        reorderTracks: async (
          playlistID: string,
          tracks: Track[],
          targetTrack: Track,
          position: 'above' | 'below',
        ): Promise<void> => {
          if (tracks.includes(targetTrack)) return;

          try {
            perfLogger.measure('usePlaylistsStore.reorderTracks entered');

            perfLogger.measure('Before IPC call (db.playlists.reorderTracks)');

            // Now uses optimized backend method instead of full reload
            await db.playlists.reorderTracks(playlistID, tracks, targetTrack, position);

            perfLogger.measure('After IPC call completed', {
              playlistID,
              tracksCount: tracks.length,
            });

            // OPTIMIZATION 3: Removed router.revalidate() - not needed with optimistic UI
            // The UI is already updated optimistically in TrackList component
            // Backend sync happens in background, no need to reload data
            perfLogger.measure('Skipped router.revalidate (using optimistic UI)');
          } catch (err: any) {
            logger.warn(err);
            perfLogger.measure('Error in reorderTracks', { error: String(err) });
            throw err; // Re-throw so optimistic UI can handle error with router.revalidate()
          }
        },

        /**
         * Export a playlist to a .m3u file
         *
         * DEBT-006: Uses ABSOLUTE paths (track.path from DB) for better compatibility.
         * - Absolute paths work reliably on the same system
         * - Relative paths would be portable but require preserving folder structure
         * - Current approach matches standard DJ software behavior (Traktor, Rekordbox)
         *
         * Future enhancement: Add option in settings to choose absolute vs relative paths
         *
         * AIDEV-NOTE: Phase 5 - Playlist export not yet implemented in Tauri backend
         */
        exportToM3u: async (playlistID: string): Promise<void> => {
          const playlist = await db.playlists.findOnlyByID(playlistID);
          if (!playlist) {
            logger.warn(`Playlist ${playlistID} not found`);
            return;
          }

          // TODO: Implement export_playlist_to_m3u command in backend
          logger.warn('[Phase 5] Playlist export to M3U not yet implemented in Tauri backend');
          console.warn('[Phase 5] exportToM3u needs backend implementation', {
            playlistName: playlist.name,
            trackCount: playlist.tracks?.length || 0,
          });
        },
      },
    }),
    { name: 'PlaylistsStore' },
  ),
);

export default usePlaylistsStore;

export function usePlaylistsAPI() {
  return usePlaylistsStore(state => state.api);
}
