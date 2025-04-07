import { ipcMain } from 'electron';

import channels from '../../preload/lib/ipc-channels';
import { Playlist, Track, TrackId } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import { Database } from '../lib/db/database';
import log from 'electron-log';
/**
 * Module in charge of returning the track with tags fixed
 */
class DatabaseModule extends ModuleWindow {
  protected db: Database;

  constructor(window: Electron.BrowserWindow) {
    super(window);
    this.db = new Database();
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
      return tracks;
    });

    ipcMain.handle(channels.TRACK_UPDATE, (_, track: Track): Promise<void> => {
      return this.db.updateTrack(track);
    });

    ipcMain.handle(channels.TRACKS_REMOVE, (_, trackIDs: TrackId[]): Promise<void> => {
      return this.db.removeTracks(trackIDs);
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

    ipcMain.handle(channels.DB_RESET, (): Promise<void> => {
      return this.db.reset();
    });
  }
}

export default DatabaseModule;
