import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { Playlist, Track, TrackId } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import { Database } from '../lib/db/database';
import { emitLibraryChanged } from '../lib/library-events';
import { deduplicateAndMergeTracks } from '../lib/track-merge';
import log from 'electron-log';
/**
 * Module in charge of returning the track with tags fixed
 */
class DatabaseModule extends ModuleWindow {
  protected db: Database;

  constructor(window: Electron.BrowserWindow) {
    super(window);
    this.db = Database.getInstance();
  }

  async load(): Promise<void> {
    ipcMain.handle(channels.TRACK_ALL, (): Promise<Array<Track>> => {
      return this.db.getAllTracks();
    });

    ipcMain.handle(channels.TRACKS_RECENT, (_, days?: number): Promise<Array<Track>> => {
      return this.db.getRecentTracks(days);
    });

    ipcMain.handle(channels.TRACKS_ADD, async (_, tracks: Track[]): Promise<Track[]> => {
      log.info(`Adding ${tracks.length} tracks to the database`);

      // Deduplicate and smart merge tracks
      // Get existing tracks by path to detect duplicates
      const existingTracks = await this.db.findTracksByPath(tracks.map(track => track.path));

      // Use deduplicateAndMergeTracks to identify new tracks and tracks needing update
      const { newTracks, tracksToUpdate } = deduplicateAndMergeTracks(existingTracks, tracks);

      // Insert new tracks
      if (newTracks.length > 0) {
        await this.db.insertTracks(newTracks);
        log.info(`Inserted ${newTracks.length} new tracks`);
      }

      // Update tracks with merged metadata
      if (tracksToUpdate.length > 0) {
        for (const track of tracksToUpdate) {
          await this.db.updateTrack(track);
        }
        log.info(`Updated ${tracksToUpdate.length} existing tracks with new metadata`);
      }

      if (newTracks.length === 0 && tracksToUpdate.length === 0) {
        log.info('No new tracks to add and no tracks to update');
        return [];
      }

      // Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);
      emitLibraryChanged('tracks-added', newTracks.length);

      return [...newTracks, ...tracksToUpdate];
    });

    ipcMain.handle(channels.TRACK_UPDATE, async (_, track: Track): Promise<void> => {
      await this.db.updateTrack(track);
      emitLibraryChanged('tracks-updated', 1);
    });

    ipcMain.handle(channels.TRACKS_UPDATE_MULTIPLE, async (_, tracks: Track[]): Promise<void> => {
      log.info(`Batch updating ${tracks.length} tracks in database`);
      for (const track of tracks) {
        await this.db.updateTrack(track);
      }
      emitLibraryChanged('tracks-updated', tracks.length);
      log.info(`Batch update complete: ${tracks.length} tracks`);
    });

    ipcMain.handle(channels.TRACKS_REMOVE, async (_, trackIDs: TrackId[]): Promise<void> => {
      await this.db.removeTracks(trackIDs);

      // Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);
      emitLibraryChanged('tracks-removed', trackIDs.length);
    });

    ipcMain.handle(channels.TRACKS_BY_ID, (_, tracksIDs: string[]): Promise<Array<Track>> => {
      return this.db.findTracksByID(tracksIDs);
    });

    ipcMain.handle(channels.TRACKS_BY_PATH, (_, paths: string[]): Promise<Array<Track>> => {
      return this.db.findTracksByPath(paths);
    });

    ipcMain.handle(channels.TRACK_BY_ID, (_, trackID: string): Promise<Track> => {
      return this.db.findTrackByID(trackID);
    });

    ipcMain.handle(channels.TRACK_BY_PATH, (_, path: string): Promise<Track> => {
      return this.db.findTrackByPath(path);
    });

    ipcMain.handle(channels.PLAYLIST_ALL, (): Promise<Array<Playlist>> => {
      return this.db.getAllPlaylists();
    });

    ipcMain.handle(channels.PLAYLIST_ADD, async (_, playlist: Playlist): Promise<Playlist> => {
      const result = await this.db.insertPlaylist(playlist);
      emitLibraryChanged('playlists-changed', 1);
      return result;
    });

    ipcMain.handle(channels.PLAYLIST_RENAME, async (_, playlistID: string, name: string): Promise<void> => {
      await this.db.renamePlaylist(playlistID, name);
      emitLibraryChanged('playlists-changed', 1);
    });

    ipcMain.handle(channels.PLAYLIST_REMOVE, async (_, playlistID: string): Promise<void> => {
      await this.db.removePlaylist(playlistID);
      emitLibraryChanged('playlists-changed', 1);
    });

    ipcMain.handle(channels.PLAYLISTS_BY_ID, (_, playlistIDs: string[]): Promise<Array<Playlist>> => {
      return this.db.findPlaylistByID(playlistIDs);
    });

    ipcMain.handle(channels.PLAYLIST_BY_ID, (_, playlistID: string): Promise<Playlist> => {
      return this.db.findPlaylistOnlyByID(playlistID);
    });

    ipcMain.handle(channels.PLAYLIST_SET_TRACKS, async (_, playlistID: string, tracks: Track[]): Promise<void> => {
      await this.db.setTracks(playlistID, tracks);
      emitLibraryChanged('playlists-changed', 1);
    });

    // Optimized IPC handler for track reordering (DEBT-005)
    ipcMain.handle(
      channels.PLAYLIST_REORDER_TRACKS,
      async (
        _,
        playlistID: string,
        tracksToMove: Track[],
        targetTrack: Track,
        position: 'above' | 'below',
      ): Promise<void> => {
        await this.db.reorderTracks(playlistID, tracksToMove, targetTrack, position);
        emitLibraryChanged('playlists-changed', 1);
      },
    );

    ipcMain.handle(channels.DB_RESET, (): Promise<void> => {
      return this.db.reset();
    });

    // Prune Mode - To Delete Playlist IPC Handlers
    ipcMain.handle(channels.PLAYLIST_TO_DELETE_GET, (): Promise<Playlist> => {
      return this.db.getOrCreateToDeletePlaylist();
    });

    ipcMain.handle(channels.PLAYLIST_TO_DELETE_ADD_TRACK, (_, trackId: TrackId): Promise<void> => {
      return this.db.addTrackToToDeletePlaylist(trackId);
    });

    ipcMain.handle(channels.PLAYLIST_TO_DELETE_REMOVE_TRACK, (_, trackId: TrackId): Promise<void> => {
      return this.db.removeTrackFromToDeletePlaylist(trackId);
    });

    ipcMain.handle(channels.PLAYLIST_TO_DELETE_CLEAR, (): Promise<void> => {
      return this.db.clearToDeletePlaylist();
    });

    // Preparation Mode - Set Preparation Playlist IPC Handlers
    ipcMain.handle(channels.PLAYLIST_PREPARATION_GET, (): Promise<Playlist> => {
      return this.db.getOrCreatePreparationPlaylist();
    });

    ipcMain.handle(channels.PLAYLIST_PREPARATION_ADD_TRACK, (_, trackId: TrackId): Promise<void> => {
      return this.db.addTrackToPreparationPlaylist(trackId);
    });

    ipcMain.handle(channels.PLAYLIST_PREPARATION_REMOVE_TRACK, (_, trackId: TrackId): Promise<void> => {
      return this.db.removeTrackFromPreparationPlaylist(trackId);
    });

    ipcMain.handle(channels.PLAYLIST_PREPARATION_CLEAR, (): Promise<void> => {
      return this.db.clearPreparationPlaylist();
    });
  }
}

export default DatabaseModule;
