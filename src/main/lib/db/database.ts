import path from 'path';

import { app } from 'electron';
import { DataSource, In } from 'typeorm';
import log from 'electron-log';

import { Playlist, PlaylistTrack, Track, TrackId } from '../../../preload/types/harmony';
import { TrackEntity, PlaylistEntity, PlaylistTrackEntity } from './entities';
import makeID from '../../../preload/lib/id-provider';

const pathUserData = app.getPath('userData');
const dbPath = path.join(pathUserData, 'database/harmony.db');

export class Database {
  private connection!: DataSource;

  public constructor() {
    this.init();
  }

  // AIDEV-NOTE: Helper to maintain backward compatibility with existing code
  // Converts PlaylistTrack[] (with order) to Track[] sorted by order
  private mapPlaylistToTracks(playlist: Playlist & { playlistTracks?: PlaylistTrack[] }): Playlist {
    if (!playlist.playlistTracks) {
      return { ...playlist, tracks: [] };
    }

    const sortedTracks = playlist.playlistTracks
      .sort((a, b) => a.order - b.order)
      .map(pt => pt.track!)
      .filter(track => track !== undefined);

    return {
      id: playlist.id,
      name: playlist.name,
      tracks: sortedTracks,
    };
  }

  public async init(): Promise<void> {
    const AppDataSource = new DataSource({
      synchronize: true,
      type: 'sqlite',
      database: dbPath,
      entities: [TrackEntity, PlaylistEntity, PlaylistTrackEntity],
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
    log.info('[db] tracks to remove: ', trackIDs.length);
    await repository.delete(trackIDs);
    log.info('[db] tracks removed');
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
    // AIDEV-NOTE: Load playlistTracks relation with eager-loaded tracks
    const playlists = await repository.find({
      relations: ['playlistTracks'],
    });

    // AIDEV-NOTE: Map to legacy format with tracks array for backward compatibility
    return playlists.map(p => this.mapPlaylistToTracks(p));
  }

  public async insertPlaylist(playlist: Playlist): Promise<Playlist> {
    const playlistRepo = this.connection.getRepository<Playlist>(PlaylistEntity);
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    // AIDEV-NOTE: Save playlist first (without tracks)
    const savedPlaylist = await playlistRepo.save({
      id: playlist.id,
      name: playlist.name,
    });

    // AIDEV-NOTE: If tracks are provided, create PlaylistTracks
    if (playlist.tracks && playlist.tracks.length > 0) {
      const playlistTracks = playlist.tracks.map((track, index) => ({
        id: makeID(),
        playlistId: savedPlaylist.id,
        trackId: track.id,
        order: index,
      }));

      await playlistTrackRepo.save(playlistTracks);
    }

    // AIDEV-NOTE: Return the saved playlist with tracks for consistency
    return this.findPlaylistOnlyByID(savedPlaylist.id);
  }

  public async renamePlaylist(playlistID: string, name: string): Promise<void> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    // AIDEV-NOTE: Load playlistTracks relation to preserve them when saving
    const playlist = await repository.findOne({
      where: {
        id: playlistID,
      },
      relations: ['playlistTracks'],
    });

    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistID} not found`);
    }

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
    // AIDEV-NOTE: Load playlistTracks relation
    const playlists = await repository.find({
      where: {
        id: In(playlistIDs),
      },
      relations: ['playlistTracks'],
    });

    return playlists.map(p => this.mapPlaylistToTracks(p));
  }

  public async findPlaylistOnlyByID(playlistID: string): Promise<Playlist> {
    const repository = this.connection.getRepository<Playlist>(PlaylistEntity);
    // AIDEV-NOTE: Load playlistTracks relation
    const playlist = await repository.findOne({
      where: {
        id: playlistID,
      },
      relations: ['playlistTracks'],
    });

    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistID} not found`);
    }

    return this.mapPlaylistToTracks(playlist);
  }

  public async setTracks(playlistID: string, tracks: Track[]): Promise<void> {
    const playlistRepo = this.connection.getRepository<Playlist>(PlaylistEntity);
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    // AIDEV-NOTE: Verify playlist exists
    const playlist = await playlistRepo.findOne({ where: { id: playlistID } });
    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistID} not found`);
    }

    // AIDEV-NOTE: Delete all existing PlaylistTracks for this playlist
    await playlistTrackRepo.delete({ playlistId: playlistID });

    // AIDEV-NOTE: Create new PlaylistTracks with order indices
    const playlistTracks = tracks.map((track, index) => ({
      id: makeID(),
      playlistId: playlistID,
      trackId: track.id,
      order: index,
    }));

    await playlistTrackRepo.save(playlistTracks);
  }

  // AIDEV-NOTE: Optimized method for surgical reordering updates
  // Only updates the 'order' column for affected tracks instead of deleting/recreating all
  public async reorderTracks(
    playlistID: string,
    tracksToMove: Track[],
    targetTrack: Track,
    position: 'above' | 'below',
  ): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    // 1. Load current PlaylistTracks ordered
    const allPlaylistTracks = await playlistTrackRepo.find({
      where: { playlistId: playlistID },
      relations: ['track'],
      order: { order: 'ASC' },
    });

    // 2. Filter out tracks being moved
    const trackIdsToMove = tracksToMove.map(t => t.id);
    const remainingTracks = allPlaylistTracks.filter(pt => !trackIdsToMove.includes(pt.trackId));

    // 3. Find target position
    let targetIndex = remainingTracks.findIndex(pt => pt.trackId === targetTrack.id);
    if (targetIndex === -1) {
      throw new Error('Target track not found in playlist');
    }

    if (position === 'below') {
      targetIndex += 1;
    }

    // 4. Get PlaylistTracks to move
    const playlistTracksToMove = allPlaylistTracks.filter(pt => trackIdsToMove.includes(pt.trackId));

    // 5. Insert at target position
    remainingTracks.splice(targetIndex, 0, ...playlistTracksToMove);

    // 6. Update only the order indices (surgical update)
    const updates = remainingTracks.map((pt, index) => ({
      ...pt,
      order: index,
    }));

    await playlistTrackRepo.save(updates);
  }

  public async reset(): Promise<void> {
    const playlistRepo = this.connection.getRepository<Playlist>(PlaylistEntity);
    const trackRepo = this.connection.getRepository<Track>(TrackEntity);

    await playlistRepo.clear();
    await trackRepo.clear();
  }

  // AIDEV-NOTE: Prune Mode - To Delete Playlist Methods
  // Special internal playlist with ID '__TO_DELETE__' for tracks marked for deletion
  private readonly TO_DELETE_PLAYLIST_ID = '__TO_DELETE__';
  private readonly TO_DELETE_PLAYLIST_NAME = 'To Delete';

  public async getOrCreateToDeletePlaylist(): Promise<Playlist> {
    const playlistRepo = this.connection.getRepository<Playlist>(PlaylistEntity);

    let playlist = await playlistRepo.findOne({
      where: { id: this.TO_DELETE_PLAYLIST_ID },
      relations: ['playlistTracks'],
    });

    if (!playlist) {
      // Create the playlist if it doesn't exist
      playlist = await playlistRepo.save({
        id: this.TO_DELETE_PLAYLIST_ID,
        name: this.TO_DELETE_PLAYLIST_NAME,
      });
      // Load relations after creation
      playlist = await playlistRepo.findOne({
        where: { id: this.TO_DELETE_PLAYLIST_ID },
        relations: ['playlistTracks'],
      });
    }

    return this.mapPlaylistToTracks(playlist!);
  }

  public async addTrackToToDeletePlaylist(trackId: TrackId): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    // Ensure playlist exists
    await this.getOrCreateToDeletePlaylist();

    // Check if track already exists in playlist
    const existing = await playlistTrackRepo.findOne({
      where: {
        playlistId: this.TO_DELETE_PLAYLIST_ID,
        trackId,
      },
    });

    if (existing) {
      log.info(`[db] Track ${trackId} already in To Delete playlist`);
      return;
    }

    // Get current max order
    const maxOrder = await playlistTrackRepo
      .createQueryBuilder('pt')
      .where('pt.playlistId = :playlistId', { playlistId: this.TO_DELETE_PLAYLIST_ID })
      .select('MAX(pt.order)', 'max')
      .getRawOne();

    const nextOrder = (maxOrder?.max ?? -1) + 1;

    // Add track at the end
    await playlistTrackRepo.save({
      id: makeID(),
      playlistId: this.TO_DELETE_PLAYLIST_ID,
      trackId,
      order: nextOrder,
    });

    log.info(`[db] Track ${trackId} added to To Delete playlist at position ${nextOrder}`);
  }

  public async removeTrackFromToDeletePlaylist(trackId: TrackId): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    await playlistTrackRepo.delete({
      playlistId: this.TO_DELETE_PLAYLIST_ID,
      trackId,
    });

    log.info(`[db] Track ${trackId} removed from To Delete playlist`);
  }

  public async clearToDeletePlaylist(): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    await playlistTrackRepo.delete({
      playlistId: this.TO_DELETE_PLAYLIST_ID,
    });

    log.info('[db] To Delete playlist cleared');
  }

  // AIDEV-NOTE: Preparation Mode - Set Preparation Playlist Methods
  // Special internal playlist with ID '__PREPARATION__' for tracks selected for a set
  private readonly PREPARATION_PLAYLIST_ID = '__PREPARATION__';
  private readonly PREPARATION_PLAYLIST_NAME = 'Set Preparation';

  public async getOrCreatePreparationPlaylist(): Promise<Playlist> {
    const playlistRepo = this.connection.getRepository<Playlist>(PlaylistEntity);

    let playlist = await playlistRepo.findOne({
      where: { id: this.PREPARATION_PLAYLIST_ID },
      relations: ['playlistTracks'],
    });

    if (!playlist) {
      // Create the playlist if it doesn't exist
      playlist = await playlistRepo.save({
        id: this.PREPARATION_PLAYLIST_ID,
        name: this.PREPARATION_PLAYLIST_NAME,
      });
      // Load relations after creation
      playlist = await playlistRepo.findOne({
        where: { id: this.PREPARATION_PLAYLIST_ID },
        relations: ['playlistTracks'],
      });
    }

    return this.mapPlaylistToTracks(playlist!);
  }

  public async addTrackToPreparationPlaylist(trackId: TrackId): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    // Ensure playlist exists
    await this.getOrCreatePreparationPlaylist();

    // Check if track already exists in playlist
    const existing = await playlistTrackRepo.findOne({
      where: {
        playlistId: this.PREPARATION_PLAYLIST_ID,
        trackId,
      },
    });

    if (existing) {
      log.info(`[db] Track ${trackId} already in Preparation playlist`);
      return;
    }

    // Get current max order
    const maxOrder = await playlistTrackRepo
      .createQueryBuilder('pt')
      .where('pt.playlistId = :playlistId', { playlistId: this.PREPARATION_PLAYLIST_ID })
      .select('MAX(pt.order)', 'max')
      .getRawOne();

    const nextOrder = (maxOrder?.max ?? -1) + 1;

    // Add track at the end
    await playlistTrackRepo.save({
      id: makeID(),
      playlistId: this.PREPARATION_PLAYLIST_ID,
      trackId,
      order: nextOrder,
    });

    log.info(`[db] Track ${trackId} added to Preparation playlist at position ${nextOrder}`);
  }

  public async removeTrackFromPreparationPlaylist(trackId: TrackId): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    await playlistTrackRepo.delete({
      playlistId: this.PREPARATION_PLAYLIST_ID,
      trackId,
    });

    log.info(`[db] Track ${trackId} removed from Preparation playlist`);
  }

  public async clearPreparationPlaylist(): Promise<void> {
    const playlistTrackRepo = this.connection.getRepository<PlaylistTrack>(PlaylistTrackEntity);

    await playlistTrackRepo.delete({
      playlistId: this.PREPARATION_PLAYLIST_ID,
    });

    log.info('[db] Preparation playlist cleared');
  }
}

export type DatabaseType = typeof Database;
