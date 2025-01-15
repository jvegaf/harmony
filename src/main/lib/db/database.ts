import path from 'path';

import { app } from 'electron';
import { DataSource, In } from 'typeorm';

import { Playlist, Track, TrackId } from '../../../preload/types/harmony';

import { TrackEntity, PlaylistEntity } from './entities';
import log from 'electron-log';

const pathUserData = app.getPath('userData');
const dbPath = path.join(pathUserData, 'database/harmony.db');

export class Database {
  private connection!: DataSource;

  public constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    const AppDataSource = new DataSource({
      synchronize: true,
      type: 'sqlite',
      database: dbPath,
      entities: [TrackEntity, PlaylistEntity],
      entitySkipConstructor: true,
    });
    AppDataSource.initialize()
      .then(() => {
        log.info('Data Source has been initialized!');
        log.info('database path: ', dbPath);
      })
      .catch((err: any) => {
        log.error(`Error during Data Source initialization ${err}`);
      });
    this.connection = AppDataSource;
  }

  public async getAllTracks(): Promise<Track[]> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    const tracks = await repository.find();

    return tracks;
  }

  public async insertTracks(tracks: Track[]): Promise<void> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    await repository.save(tracks);
  }

  public async updateTrack(track: Track): Promise<void> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    await repository.save(track);
  }

  public async removeTracks(trackIDs: TrackId[]): Promise<void> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    await repository.delete(trackIDs);
  }

  public async findTracksByID(tracksIDs: string[]): Promise<Track[]> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    return repository.findBy({
      id: In(tracksIDs),
    });
  }

  public async findTracksByPath(paths: string[]): Promise<Track[]> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    return repository.findBy({
      path: In(paths),
    });
  }

  public async findTrackByID(trackID: string): Promise<Track> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    return repository.findOneByOrFail({
      id: trackID,
    });
  }

  public async findTrackByPath(path: string): Promise<Track> {
    const repository = this.connection.getRepository<Track>(TrackEntity);
    return repository.findOneByOrFail({
      path: path,
    });
  }

  public async getAllPlaylists(): Promise<Playlist[]> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    const playlists = await repository.find();

    return playlists;
  }

  public async insertPlaylist(playlist: Playlist): Promise<Playlist> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    return await repository.save(playlist);
  }

  public async renamePlaylist(playlistID: string, name: string): Promise<void> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    const playlist = await repository.findOneByOrFail({
      id: playlistID,
    });
    await repository.save({
      ...playlist,
      name,
    });
  }

  public async removePlaylist(playlistID: string): Promise<void> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    await repository.delete(playlistID);
  }

  public async findPlaylistByID(playlistIDs: string[]): Promise<Playlist[]> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    return repository.findBy({
      id: In(playlistIDs),
    });
  }

  public async findPlaylistOnlyByID(playlistID: string): Promise<Playlist> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    return repository.findOneByOrFail({
      id: playlistID,
    });
  }

  public async setTracks(playlistID: string, tracks: Track[]) {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    const playlist = await repository.findOneByOrFail({
      id: playlistID,
    });
    await repository.save({
      ...playlist,
      tracks: tracks,
    });
  }

  public async reset(): Promise<void> {
    const playlistRepo = this.connection.getRepository<Playlist>(PlaylistEntity);
    const trackRepo = this.connection.getRepository<Track>(TrackEntity);

    await playlistRepo.clear();
    await trackRepo.clear();
  }
}

export type DatabaseType = typeof Database;
