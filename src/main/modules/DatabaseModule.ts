import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { Playlist, Track, TrackId } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import { Database } from '../lib/db/database';
import { emitLibraryChanged } from '../lib/library-events';
import log from 'electron-log';
/**
 * Module in charge of returning the track with tags fixed
 */
class DatabaseModule extends ModuleWindow {
  protected db: Database;

  constructor(window: Electron.BrowserWindow) {
    super(window);
    // AIDEV-NOTE: Use singleton instance to prevent multiple database connections
    this.db = Database.getInstance();
  }

  async load(): Promise<void> {
    ipcMain.handle(channels.TRACK_ALL, (): Promise<Array<Track>> => {
      return this.db.getAllTracks();
    });

    ipcMain.handle(channels.TRACKS_ADD, async (_, tracks: Track[]): Promise<Track[]> => {
      log.info('Adding tracks to the database');
      // Check if the tracks are already in the database
      const existingTracks = await this.db.findTracksByPath(tracks.map(track => track.path));

      const newTracks = tracks.filter(track => {
        return !existingTracks.some(existingTrack => existingTrack.path === track.path);
      });
      if (newTracks.length === 0) {
        log.info('No new tracks to add to the database');
        return [];
      }

      await this.db.insertTracks(newTracks);
      log.info('Tracks added to the database');

      // Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);

      // AIDEV-NOTE: Emit library change event for auto-sync
      emitLibraryChanged('tracks-added', newTracks.length);

      return tracks;
    });

    ipcMain.handle(channels.TRACK_UPDATE, (_, track: Track): Promise<void> => {
      return this.db.updateTrack(track);
    });

    ipcMain.handle(channels.TRACKS_REMOVE, async (_, trackIDs: TrackId[]): Promise<void> => {
      await this.db.removeTracks(trackIDs);

      // Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);

      // AIDEV-NOTE: Emit library change event for auto-sync
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

    ipcMain.handle(channels.PLAYLIST_ADD, (_, playlist: Playlist): Promise<Playlist> => {
      return this.db.insertPlaylist(playlist);
    });

    ipcMain.handle(channels.PLAYLIST_RENAME, (_, playlistID: string, name: string): Promise<void> => {
      return this.db.renamePlaylist(playlistID, name);
    });

    ipcMain.handle(channels.PLAYLIST_REMOVE, (_, playlistID: string): Promise<void> => {
      return this.db.removePlaylist(playlistID);
    });

    ipcMain.handle(channels.PLAYLISTS_BY_ID, (_, playlistIDs: string[]): Promise<Array<Playlist>> => {
      return this.db.findPlaylistByID(playlistIDs);
    });

    ipcMain.handle(channels.PLAYLIST_BY_ID, (_, playlistID: string): Promise<Playlist> => {
      return this.db.findPlaylistOnlyByID(playlistID);
    });

    ipcMain.handle(channels.PLAYLIST_SET_TRACKS, (_, playlistID: string, tracks: Track[]): Promise<void> => {
      return this.db.setTracks(playlistID, tracks);
    });

    // AIDEV-NOTE: New optimized IPC handler for track reordering
    ipcMain.handle(
      channels.PLAYLIST_REORDER_TRACKS,
      (
        _,
        playlistID: string,
        tracksToMove: Track[],
        targetTrack: Track,
        position: 'above' | 'below',
      ): Promise<void> => {
        return this.db.reorderTracks(playlistID, tracksToMove, targetTrack, position);
      },
    );

    ipcMain.handle(channels.DB_RESET, (): Promise<void> => {
      return this.db.reset();
    });

    // AIDEV-NOTE: Prune Mode - To Delete Playlist IPC Handlers
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

    // AIDEV-NOTE: Preparation Mode - Set Preparation Playlist IPC Handlers
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
