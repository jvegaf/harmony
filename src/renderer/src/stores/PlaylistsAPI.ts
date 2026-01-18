import channels from '../../../preload/lib/ipc-channels';
import router from '../views/router';
import makeID from '../../../preload/lib/id-provider';

import usePlayerStore from './usePlayerStore';
import { Playlist, Track } from '../../../preload/types/harmony';
import useLibraryStore from './useLibraryStore';
import { perfLogger } from '../lib/performance-logger';

const { db, logger } = window.Main;
const { ipcRenderer } = window.ElectronAPI;

/**
 * Start playing playlist (on double click)
 */
const play = async (playlistID: string): Promise<void> => {
  try {
    const playlist: Playlist = await db.playlists.findOnlyByID(playlistID);
    const queue = playlist.tracks!.map(track => track.id);
    const index = 0;
    usePlayerStore.getState().api.start(queue, index).catch(logger.warn);
  } catch (err) {
    logger.warn((err as Error).message);
  }
};

/**
 * Create a new playlist
 */
const create = async (name: string, tracks: Track[] = [], redirect = false): Promise<string | null> => {
  try {
    const playlist: Playlist = {
      id: makeID(),
      name,
      tracks,
    };

    const doc = await db.playlists.insert(playlist);
    router.revalidate();
    useLibraryStore.getState().api.setRenamingPlaylist(doc.id);

    if (redirect) router.navigate(`/playlists/${doc.id}`);
    // else toast({ description: `The playlist "${name}" was created` });

    return doc.id;
  } catch (err: any) {
    logger.error(err);

    // toast({ variant: 'destructive', description: `The playlist coult not be created.` });

    return null;
  }
};

/**
 * Rename a playlist
 */
const rename = async (playlistID: string, name: string): Promise<void> => {
  try {
    await db.playlists.rename(playlistID, name);
    router.revalidate();
  } catch (err: any) {
    logger.warn(err);
  }
};

/**
 * Delete a playlist
 */
const remove = async (playlistID: string): Promise<void> => {
  logger.debug('calling remove playlist api');
  try {
    // AIDEV-NOTE: Check if user is currently viewing the playlist being deleted
    // If so, navigate away to prevent app crash due to lost reference
    const currentPath = router.state.location.pathname;
    const isViewingPlaylist = currentPath === `/playlists/${playlistID}`;

    if (isViewingPlaylist) {
      logger.info(`User is viewing playlist ${playlistID}, navigating to library before deletion`);
      await router.navigate('/');
    }

    await db.playlists.remove(playlistID);
    router.revalidate();
    // FIX these when there is no more playlists
  } catch (err: any) {
    logger.warn(err);
  }
};

/**
 * Add tracks to a playlist
 */
const addTracks = async (playlistID: string, tracks: Track[], isShown?: boolean): Promise<void> => {
  // isShown should never be true, letting it here anyway to remember of a design issue
  if (isShown) return;

  try {
    const playlist = await db.playlists.findOnlyByID(playlistID);
    const playlistTracks = [...playlist.tracks, ...tracks.filter(track => !playlist.tracks.includes(track))];
    await db.playlists.setTracks(playlistID, playlistTracks);
    router.revalidate();
    // toast({ description: `${tracks.length} tracks were successfully added to "${playlist.name}"` });
  } catch (err: any) {
    logger.warn(err);
    if (err instanceof Error) {
      // toast({ variant: 'destructive', description: err.message });
    } else {
      // toast({ variant: 'destructive', description: 'An unknown error happened while trying to add tracks.' });
    }
  }
};

/**
 * Remove tracks from a playlist
 */
const removeTracks = async (playlistID: string, tracks: Track[]): Promise<void> => {
  try {
    const playlist = await db.playlists.findOnlyByID(playlistID);
    const playlistTracks = playlist.tracks.filter((elem: Track) => !tracks.includes(elem));
    await db.playlists.setTracks(playlistID, playlistTracks);
    router.revalidate();
  } catch (err: any) {
    logger.warn(err);
  }
};

/**
 * Duplicate a playlist
 */
const duplicate = async (playlistID: string): Promise<void> => {
  try {
    const playlist = await db.playlists.findOnlyByID(playlistID);
    const { tracks } = playlist;

    const newPlaylist: Playlist = {
      id: makeID(),
      name: `Copy of ${playlist.name}`,
      tracks: tracks,
    };

    await db.playlists.insert(newPlaylist);
    router.revalidate();
    useLibraryStore.getState().api.setRenamingPlaylist(newPlaylist.id);
  } catch (err: any) {
    logger.warn(err);
  }
};

/**
 * Reorder tracks in a playlists
 * TODO: currently only supports one track at a time, at a point you should be
 * able to re-order a selection of tracks
 */
const reorderTracks = async (
  playlistID: string,
  tracks: Track[],
  targetTrack: Track,
  position: 'above' | 'below',
): Promise<void> => {
  if (tracks.includes(targetTrack)) return;

  try {
    perfLogger.measure('PlaylistsAPI.reorderTracks entered');

    perfLogger.measure('Before IPC call (db.playlists.reorderTracks)');

    // AIDEV-NOTE: Now uses optimized backend method instead of full reload
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
};

/**
 * a playlist to a .m3u file
 * TODO: investigate why the playlist path are relative, and not absolute
 */
const exportToM3u = async (playlistID: string): Promise<void> => {
  const playlist: Playlist = await db.playlists.findOnlyByID(playlistID);

  ipcRenderer.send(
    channels.PLAYLIST_EXPORT,
    playlist.name,
    playlist.tracks?.map(track => track.path),
  );
};

// Should we use something else to harmonize between zustand and non-store APIs?
const PlaylistsAPI = {
  play,
  create,
  rename,
  remove,
  addTracks,
  reorderTracks,
  removeTracks,
  duplicate,
  exportToM3u,
};

export default PlaylistsAPI;
