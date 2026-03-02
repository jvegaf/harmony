import path from 'path';
import fs from 'fs';

import { app } from 'electron';
import BetterSqlite3 from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, inArray, sql, max, asc, and } from 'drizzle-orm';
import log from 'electron-log';

import { Playlist, Track, TrackId, Folder } from '../../../preload/types/harmony';
import { CuePoint } from '../../../preload/types/cue-point';
import * as schema from './schema';
import makeID from '../../../preload/lib/id-provider';

const pathUserData = app.getPath('userData');
const dbPath = path.join(pathUserData, 'database/harmony.db');

// AIDEV-NOTE: Singleton instance to prevent multiple Database connections
let databaseInstance: Database | null = null;

export class Database {
  private sqlite!: BetterSqlite3.Database;
  private db!: BetterSQLite3Database<typeof schema>;
  private static isInitializing = false;

  private constructor() {
    // AIDEV-NOTE: better-sqlite3 is synchronous, so initialization is immediate
    // We wrap everything in try-catch to handle any connection errors
    this.init();
  }

  // AIDEV-NOTE: Singleton accessor - ensures only one Database instance exists
  public static getInstance(): Database {
    if (!databaseInstance) {
      databaseInstance = new Database();
    }
    return databaseInstance;
  }

  // AIDEV-NOTE: Helper to maintain backward compatibility with existing code
  // Converts PlaylistTrack[] (with order) to Track[] sorted by order
  private mapPlaylistToTracks(playlist: any): Playlist {
    if (!playlist.playlistTracks) {
      return { ...playlist, tracks: [] };
    }

    const sortedTracks = playlist.playlistTracks
      .sort((a: any, b: any) => a.order - b.order)
      .map((pt: any) => pt.track)
      .filter((track: any) => track !== undefined);

    return {
      id: playlist.id,
      name: playlist.name,
      tracks: sortedTracks as Track[],
    };
  }

  // AIDEV-NOTE: Clean up stale journal files that may cause SQLITE_BUSY errors
  // This happens when a previous session crashed during a transaction
  private cleanJournalFiles(): void {
    const journalPath = `${dbPath}-journal`;
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    try {
      if (fs.existsSync(journalPath)) {
        log.warn(`[db] Found stale journal file, removing: ${journalPath}`);
        fs.unlinkSync(journalPath);
      }
      if (fs.existsSync(walPath)) {
        log.info(`[db] Found existing WAL file: ${walPath}`);
      }
      if (fs.existsSync(shmPath)) {
        log.info(`[db] Found existing SHM file: ${shmPath}`);
      }
    } catch (err) {
      log.error(`[db] Error cleaning journal files: ${err}`);
      // Don't throw - continue with initialization
    }
  }

  private init(): void {
    // AIDEV-NOTE: Prevent multiple simultaneous initializations
    if (Database.isInitializing) {
      log.warn('[db] Database initialization already in progress, waiting...');
      return;
    }

    Database.isInitializing = true;

    try {
      // AIDEV-NOTE: Ensure the database directory exists before opening
      // better-sqlite3 doesn't create parent directories automatically
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        log.info(`[db] Creating database directory: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Clean up stale journal files before connecting
      this.cleanJournalFiles();

      // AIDEV-NOTE: better-sqlite3 is synchronous, much simpler than TypeORM
      // All PRAGMAs are set immediately after connection
      this.sqlite = new BetterSqlite3(dbPath);

      // AIDEV-NOTE: Enable foreign keys constraint enforcement in SQLite.
      // SQLite has foreign keys disabled by default. We need to enable them
      // to ensure CASCADE DELETE works properly (e.g., removing tracks from
      // playlists when the track is deleted).
      this.sqlite.pragma('foreign_keys = ON');

      // AIDEV-NOTE: Enable WAL mode for better concurrency
      // WAL mode allows multiple readers and one writer simultaneously
      this.sqlite.pragma('journal_mode = WAL');
      this.sqlite.pragma('synchronous = NORMAL');
      this.sqlite.pragma('cache_size = 10000');
      this.sqlite.pragma('temp_store = MEMORY');
      this.sqlite.pragma('busy_timeout = 10000');

      // AIDEV-NOTE: Initialize Drizzle with schema for relational queries
      this.db = drizzle(this.sqlite, { schema });

      // AIDEV-NOTE: Run migrations to create/update tables
      // Migrations are in the 'drizzle' folder at project root
      const migrationsFolder = path.join(app.getAppPath(), 'drizzle');
      log.info(`[db] Running migrations from: ${migrationsFolder}`);
      migrate(this.db, { migrationsFolder });

      log.info('[db] Database initialized with WAL mode and foreign keys enabled!');
      log.info('[db] Database path:', dbPath);
    } catch (err: any) {
      log.error(`[db] Error during database initialization: ${err}`);
      throw err;
    } finally {
      Database.isInitializing = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Track Methods ──
  // ═══════════════════════════════════════════════════════════════════════════

  public async getAllTracks(): Promise<Track[]> {
    const tracks = this.db.select().from(schema.tracks).all();
    return tracks as Track[];
  }

  /**
   * Get tracks added in the last N days
   * AIDEV-NOTE: Used for "Recently Added" view. Filters tracks by addedAt timestamp
   * and sorts by most recent first. Tracks without addedAt are excluded.
   * @param days Number of days to look back (default: 30)
   */
  public async getRecentTracks(days: number = 30): Promise<Track[]> {
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000; // milliseconds

    const tracks = this.db
      .select()
      .from(schema.tracks)
      .where(sql`${schema.tracks.addedAt} IS NOT NULL AND ${schema.tracks.addedAt} >= ${cutoffDate}`)
      .orderBy(sql`${schema.tracks.addedAt} DESC`)
      .all();

    return tracks as Track[];
  }

  public async insertTracks(tracks: Track[]): Promise<void> {
    if (tracks.length === 0) return;

    // Handle both ID and path conflicts to prevent duplicates.
    // Now that makeTrackID() normalizes slashes and mapTraktorPathToSystem() produces
    // OS-native paths, both import sources (filesystem + Traktor) should generate
    // identical IDs and paths for the same file. The onConflictDoUpdate on ID will
    // handle the common case. The path check is a defensive fallback.
    //
    // Strategy: Pre-load all existing paths once, then for each track check if path exists.
    // If yes, update the existing track (preserving its ID and FK references).
    // If no, insert with onConflictDoUpdate on ID as a safety net.

    const isLinux = process.platform === 'linux';

    // Pre-load all existing tracks' paths once (optimized for batch inserts)
    const allExistingTracks = this.db
      .select({ id: schema.tracks.id, path: schema.tracks.path })
      .from(schema.tracks)
      .all();

    // Build a lookup map for fast path checking
    const existingByPath = new Map<string, string>(); // Map<normalizedPath, trackId>
    for (const track of allExistingTracks) {
      const key = isLinux ? track.path : track.path.toLowerCase();
      existingByPath.set(key, track.id);
    }

    for (const track of tracks) {
      // Check if a track with this path already exists
      const lookupKey = isLinux ? track.path : track.path.toLowerCase();
      const existingId = existingByPath.get(lookupKey);

      if (existingId) {
        // Path exists - update the existing track (preserve original ID to avoid breaking FKs)
        this.db
          .update(schema.tracks)
          .set({
            // Keep existing ID - never change ID
            path: track.path,
            title: track.title,
            artist: track.artist,
            album: track.album,
            genre: track.genre,
            year: track.year,
            duration: track.duration,
            bitrate: track.bitrate,
            comment: track.comment,
            bpm: track.bpm,
            initialKey: track.initialKey,
            rating: track.rating,
            label: track.label,
            waveformPeaks: track.waveformPeaks,
            url: track.url,
          })
          .where(eq(schema.tracks.id, existingId))
          .run();
      } else {
        // Path doesn't exist - insert with onConflictDoUpdate on ID as safety net
        this.db
          .insert(schema.tracks)
          .values(track)
          .onConflictDoUpdate({
            target: schema.tracks.id,
            set: {
              path: sql`excluded.path`,
              title: sql`excluded.title`,
              artist: sql`excluded.artist`,
              album: sql`excluded.album`,
              genre: sql`excluded.genre`,
              year: sql`excluded.year`,
              duration: sql`excluded.duration`,
              bitrate: sql`excluded.bitrate`,
              comment: sql`excluded.comment`,
              bpm: sql`excluded.bpm`,
              initialKey: sql`excluded.initialKey`,
              rating: sql`excluded.rating`,
              label: sql`excluded.label`,
              waveformPeaks: sql`excluded.waveformPeaks`,
              addedAt: sql`excluded.addedAt`,
              url: sql`excluded.url`,
            },
          })
          .run();
      }
    }
  }

  public async updateTrack(track: Track): Promise<void> {
    this.db
      .update(schema.tracks)
      .set({
        path: track.path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
        year: track.year,
        duration: track.duration,
        bitrate: track.bitrate,
        comment: track.comment,
        bpm: track.bpm,
        initialKey: track.initialKey,
        rating: track.rating,
        label: track.label,
        waveformPeaks: track.waveformPeaks,
        addedAt: track.addedAt,
        url: track.url,
      })
      .where(eq(schema.tracks.id, track.id))
      .run();
  }

  /**
   * Remove tracks from the database
   * AIDEV-NOTE: Thanks to CASCADE DELETE foreign keys (enabled via PRAGMA foreign_keys = ON),
   * removing tracks will automatically remove them from all playlists (playlistTrack table).
   * This ensures playlist integrity without manual cleanup.
   */
  public async removeTracks(trackIDs: TrackId[]): Promise<void> {
    log.info('[db] tracks to remove: ', trackIDs.length);
    this.db.delete(schema.tracks).where(inArray(schema.tracks.id, trackIDs)).run();
    log.info('[db] tracks removed (and automatically removed from all playlists via CASCADE)');
  }

  public async findTracksByID(tracksIDs: string[]): Promise<Track[]> {
    if (tracksIDs.length === 0) return [];
    return this.db.select().from(schema.tracks).where(inArray(schema.tracks.id, tracksIDs)).all() as Track[];
  }

  public async findTracksByPath(paths: string[]): Promise<Track[]> {
    if (paths.length === 0) return [];

    // Case-sensitivity handling for path matching.
    // On Windows/macOS (case-insensitive filesystems), we need to normalize paths
    // to match how makeTrackID() generates IDs (lowercase on non-Linux).
    // However, tracks are stored with their original case in the DB.
    //
    // Strategy: On Windows/macOS, do case-insensitive matching using SQL LOWER()
    // On Linux, do case-sensitive matching (exact match).
    const isLinux = process.platform === 'linux';

    if (isLinux) {
      // Linux: case-sensitive, exact match
      return this.db.select().from(schema.tracks).where(inArray(schema.tracks.path, paths)).all() as Track[];
    } else {
      // Windows/macOS: case-insensitive matching using SQL LOWER()
      // Build a WHERE clause: LOWER(path) IN ('path1', 'path2', ...)
      const normalizedPaths = paths.map(p => p.toLowerCase());

      // Use sql template to create LOWER(path) comparison
      const lowerPath = sql`LOWER(${schema.tracks.path})`;
      return this.db.select().from(schema.tracks).where(inArray(lowerPath, normalizedPaths)).all() as Track[];
    }
  }

  public async findTrackByID(trackID: string): Promise<Track> {
    const track = this.db.select().from(schema.tracks).where(eq(schema.tracks.id, trackID)).get();

    if (!track) {
      throw new Error(`Track with ID ${trackID} not found`);
    }

    return track as Track;
  }

  public async findTrackByPath(path: string): Promise<Track> {
    const track = this.db.select().from(schema.tracks).where(eq(schema.tracks.path, path)).get();

    if (!track) {
      throw new Error(`Track with path ${path} not found`);
    }

    return track as Track;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Playlist Methods ──
  // ═══════════════════════════════════════════════════════════════════════════

  public async getAllPlaylists(): Promise<Playlist[]> {
    // AIDEV-NOTE: Use Drizzle's relational query API for eager loading
    // With better-sqlite3, relational queries need .sync() to execute synchronously
    const playlists = this.db.query.playlists
      .findMany({
        with: {
          playlistTracks: {
            with: { track: true },
            orderBy: (pt, { asc }) => [asc(pt.order)],
          },
        },
      })
      .sync();

    // AIDEV-NOTE: Map to legacy format with tracks array for backward compatibility
    return playlists.map(p => this.mapPlaylistToTracks(p));
  }

  public async insertPlaylist(playlist: Playlist): Promise<Playlist> {
    // AIDEV-NOTE: Save playlist first (without tracks)
    this.db
      .insert(schema.playlists)
      .values({
        id: playlist.id,
        name: playlist.name,
        folderId: playlist.folderId || null,
      })
      .run();

    // AIDEV-NOTE: If tracks are provided, create PlaylistTracks
    if (playlist.tracks && playlist.tracks.length > 0) {
      const playlistTracks = playlist.tracks.map((track, index) => ({
        id: makeID(),
        playlistId: playlist.id,
        trackId: track.id,
        order: index,
      }));

      this.db.insert(schema.playlistTracks).values(playlistTracks).run();
    }

    // AIDEV-NOTE: Return the saved playlist with tracks for consistency
    return this.findPlaylistOnlyByID(playlist.id);
  }

  public async renamePlaylist(playlistID: string, name: string): Promise<void> {
    this.db.update(schema.playlists).set({ name }).where(eq(schema.playlists.id, playlistID)).run();
  }

  public async removePlaylist(playlistID: string): Promise<void> {
    this.db.delete(schema.playlists).where(eq(schema.playlists.id, playlistID)).run();
  }

  public async findPlaylistByID(playlistIDs: string[]): Promise<Playlist[]> {
    if (playlistIDs.length === 0) return [];

    const playlists = this.db.query.playlists
      .findMany({
        where: (playlists, { inArray }) => inArray(playlists.id, playlistIDs),
        with: {
          playlistTracks: {
            with: { track: true },
            orderBy: (pt, { asc }) => [asc(pt.order)],
          },
        },
      })
      .sync();

    return playlists.map(p => this.mapPlaylistToTracks(p));
  }

  public async findPlaylistOnlyByID(playlistID: string): Promise<Playlist> {
    const playlist = this.db.query.playlists
      .findFirst({
        where: (playlists, { eq }) => eq(playlists.id, playlistID),
        with: {
          playlistTracks: {
            with: { track: true },
            orderBy: (pt, { asc }) => [asc(pt.order)],
          },
        },
      })
      .sync();

    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistID} not found`);
    }

    return this.mapPlaylistToTracks(playlist);
  }

  public async setTracks(playlistID: string, tracks: Track[]): Promise<void> {
    // AIDEV-NOTE: Verify playlist exists
    const playlist = this.db.select().from(schema.playlists).where(eq(schema.playlists.id, playlistID)).get();

    if (!playlist) {
      throw new Error(`Playlist with ID ${playlistID} not found`);
    }

    // AIDEV-NOTE: Delete all existing PlaylistTracks for this playlist
    this.db.delete(schema.playlistTracks).where(eq(schema.playlistTracks.playlistId, playlistID)).run();

    // AIDEV-NOTE: Create new PlaylistTracks with order indices
    if (tracks.length > 0) {
      const playlistTracks = tracks.map((track, index) => ({
        id: makeID(),
        playlistId: playlistID,
        trackId: track.id,
        order: index,
      }));

      this.db.insert(schema.playlistTracks).values(playlistTracks).run();
    }
  }

  // AIDEV-NOTE: Optimized method for surgical reordering updates
  // Only updates the 'order' column for affected tracks instead of deleting/recreating all
  public async reorderTracks(
    playlistID: string,
    tracksToMove: Track[],
    targetTrack: Track,
    position: 'above' | 'below',
  ): Promise<void> {
    // 1. Load current PlaylistTracks ordered
    const allPlaylistTracks = this.db.query.playlistTracks
      .findMany({
        where: (pt, { eq }) => eq(pt.playlistId, playlistID),
        with: { track: true },
        orderBy: (pt, { asc }) => [asc(pt.order)],
      })
      .sync();

    // 2. Filter out tracks being moved
    const trackIdsToMove = tracksToMove.map(t => t.id);
    const remainingTracks = allPlaylistTracks.filter((pt: any) => !trackIdsToMove.includes(pt.trackId));

    // 3. Find target position
    let targetIndex = remainingTracks.findIndex((pt: any) => pt.trackId === targetTrack.id);
    if (targetIndex === -1) {
      throw new Error('Target track not found in playlist');
    }

    if (position === 'below') {
      targetIndex += 1;
    }

    // 4. Get PlaylistTracks to move
    const playlistTracksToMove = allPlaylistTracks.filter((pt: any) => trackIdsToMove.includes(pt.trackId));

    // 5. Insert at target position
    remainingTracks.splice(targetIndex, 0, ...playlistTracksToMove);

    // 6. Update only the order indices (surgical update)
    // AIDEV-NOTE: better-sqlite3 is synchronous, so we can do this in a loop
    for (let i = 0; i < remainingTracks.length; i++) {
      this.db
        .update(schema.playlistTracks)
        .set({ order: i })
        .where(eq(schema.playlistTracks.id, (remainingTracks[i] as any).id))
        .run();
    }
  }

  public async reset(): Promise<void> {
    this.db.delete(schema.playlists).run();
    this.db.delete(schema.tracks).run();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AIDEV-NOTE: Prune Mode - To Delete Playlist Methods
  // Special internal playlist with ID '__TO_DELETE__' for tracks marked for deletion
  // ═══════════════════════════════════════════════════════════════════════════

  private readonly TO_DELETE_PLAYLIST_ID = '__TO_DELETE__';
  private readonly TO_DELETE_PLAYLIST_NAME = 'To Delete';

  public async getOrCreateToDeletePlaylist(): Promise<Playlist> {
    let playlist = this.db.query.playlists
      .findFirst({
        where: (playlists, { eq }) => eq(playlists.id, this.TO_DELETE_PLAYLIST_ID),
        with: {
          playlistTracks: {
            with: { track: true },
            orderBy: (pt, { asc }) => [asc(pt.order)],
          },
        },
      })
      .sync();

    if (!playlist) {
      // Create the playlist if it doesn't exist
      this.db
        .insert(schema.playlists)
        .values({
          id: this.TO_DELETE_PLAYLIST_ID,
          name: this.TO_DELETE_PLAYLIST_NAME,
          folderId: null,
        })
        .run();

      // Load with relations after creation
      playlist = this.db.query.playlists
        .findFirst({
          where: (playlists, { eq }) => eq(playlists.id, this.TO_DELETE_PLAYLIST_ID),
          with: {
            playlistTracks: {
              with: { track: true },
              orderBy: (pt, { asc }) => [asc(pt.order)],
            },
          },
        })
        .sync();
    }

    return this.mapPlaylistToTracks(playlist!);
  }

  public async addTrackToToDeletePlaylist(trackId: TrackId): Promise<void> {
    // Ensure playlist exists
    await this.getOrCreateToDeletePlaylist();

    // Check if track already exists in playlist
    const existing = this.db
      .select()
      .from(schema.playlistTracks)
      .where(
        and(
          eq(schema.playlistTracks.playlistId, this.TO_DELETE_PLAYLIST_ID),
          eq(schema.playlistTracks.trackId, trackId),
        ),
      )
      .get();

    if (existing) {
      log.info(`[db] Track ${trackId} already in To Delete playlist`);
      return;
    }

    // Get current max order
    const result = this.db
      .select({ max: max(schema.playlistTracks.order) })
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.playlistId, this.TO_DELETE_PLAYLIST_ID))
      .get();

    const nextOrder = (result?.max ?? -1) + 1;

    // Add track at the end
    this.db
      .insert(schema.playlistTracks)
      .values({
        id: makeID(),
        playlistId: this.TO_DELETE_PLAYLIST_ID,
        trackId,
        order: nextOrder,
      })
      .run();

    log.info(`[db] Track ${trackId} added to To Delete playlist at position ${nextOrder}`);
  }

  public async removeTrackFromToDeletePlaylist(trackId: TrackId): Promise<void> {
    this.db
      .delete(schema.playlistTracks)
      .where(
        and(
          eq(schema.playlistTracks.playlistId, this.TO_DELETE_PLAYLIST_ID),
          eq(schema.playlistTracks.trackId, trackId),
        ),
      )
      .run();

    log.info(`[db] Track ${trackId} removed from To Delete playlist`);
  }

  public async clearToDeletePlaylist(): Promise<void> {
    this.db.delete(schema.playlistTracks).where(eq(schema.playlistTracks.playlistId, this.TO_DELETE_PLAYLIST_ID)).run();

    log.info('[db] To Delete playlist cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AIDEV-NOTE: Preparation Mode - Set Preparation Playlist Methods
  // Special internal playlist with ID '__PREPARATION__' for tracks selected for a set
  // ═══════════════════════════════════════════════════════════════════════════

  private readonly PREPARATION_PLAYLIST_ID = '__PREPARATION__';
  private readonly PREPARATION_PLAYLIST_NAME = 'Set Preparation';

  public async getOrCreatePreparationPlaylist(): Promise<Playlist> {
    let playlist = this.db.query.playlists
      .findFirst({
        where: (playlists, { eq }) => eq(playlists.id, this.PREPARATION_PLAYLIST_ID),
        with: {
          playlistTracks: {
            with: { track: true },
            orderBy: (pt, { asc }) => [asc(pt.order)],
          },
        },
      })
      .sync();

    if (!playlist) {
      // Create the playlist if it doesn't exist
      this.db
        .insert(schema.playlists)
        .values({
          id: this.PREPARATION_PLAYLIST_ID,
          name: this.PREPARATION_PLAYLIST_NAME,
          folderId: null,
        })
        .run();

      // Load with relations after creation
      playlist = this.db.query.playlists
        .findFirst({
          where: (playlists, { eq }) => eq(playlists.id, this.PREPARATION_PLAYLIST_ID),
          with: {
            playlistTracks: {
              with: { track: true },
              orderBy: (pt, { asc }) => [asc(pt.order)],
            },
          },
        })
        .sync();
    }

    return this.mapPlaylistToTracks(playlist!);
  }

  public async addTrackToPreparationPlaylist(trackId: TrackId): Promise<void> {
    // Ensure playlist exists
    await this.getOrCreatePreparationPlaylist();

    // Check if track already exists in playlist
    const existing = this.db
      .select()
      .from(schema.playlistTracks)
      .where(
        and(
          eq(schema.playlistTracks.playlistId, this.PREPARATION_PLAYLIST_ID),
          eq(schema.playlistTracks.trackId, trackId),
        ),
      )
      .get();

    if (existing) {
      log.info(`[db] Track ${trackId} already in Preparation playlist`);
      return;
    }

    // Get current max order
    const result = this.db
      .select({ max: max(schema.playlistTracks.order) })
      .from(schema.playlistTracks)
      .where(eq(schema.playlistTracks.playlistId, this.PREPARATION_PLAYLIST_ID))
      .get();

    const nextOrder = (result?.max ?? -1) + 1;

    // Add track at the end
    this.db
      .insert(schema.playlistTracks)
      .values({
        id: makeID(),
        playlistId: this.PREPARATION_PLAYLIST_ID,
        trackId,
        order: nextOrder,
      })
      .run();

    log.info(`[db] Track ${trackId} added to Preparation playlist at position ${nextOrder}`);
  }

  public async removeTrackFromPreparationPlaylist(trackId: TrackId): Promise<void> {
    this.db
      .delete(schema.playlistTracks)
      .where(
        and(
          eq(schema.playlistTracks.playlistId, this.PREPARATION_PLAYLIST_ID),
          eq(schema.playlistTracks.trackId, trackId),
        ),
      )
      .run();

    log.info(`[db] Track ${trackId} removed from Preparation playlist`);
  }

  public async clearPreparationPlaylist(): Promise<void> {
    this.db
      .delete(schema.playlistTracks)
      .where(eq(schema.playlistTracks.playlistId, this.PREPARATION_PLAYLIST_ID))
      .run();

    log.info('[db] Preparation playlist cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AIDEV-NOTE: CuePoint Methods - For Traktor bidirectional sync
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all cue points for a specific track
   */
  public async getCuePointsByTrackId(trackId: TrackId): Promise<CuePoint[]> {
    return this.db
      .select()
      .from(schema.cuePoints)
      .where(eq(schema.cuePoints.trackId, trackId))
      .orderBy(asc(schema.cuePoints.positionMs))
      .all() as CuePoint[];
  }

  /**
   * Get cue points for multiple tracks at once (batch operation)
   */
  public async getCuePointsByTrackIds(trackIds: TrackId[]): Promise<CuePoint[]> {
    if (trackIds.length === 0) return [];

    return this.db
      .select()
      .from(schema.cuePoints)
      .where(inArray(schema.cuePoints.trackId, trackIds))
      .orderBy(asc(schema.cuePoints.trackId), asc(schema.cuePoints.positionMs))
      .all() as CuePoint[];
  }

  /**
   * Insert or update cue points (upsert)
   * AIDEV-NOTE: Deduplicates by ID before saving to prevent UNIQUE constraint violations
   */
  public async saveCuePoints(cuePoints: CuePoint[]): Promise<void> {
    if (cuePoints.length === 0) return;

    // Deduplicate by ID to prevent UNIQUE constraint violations
    const uniqueCues = Array.from(new Map(cuePoints.map(c => [c.id, c])).values());
    const duplicatesRemoved = cuePoints.length - uniqueCues.length;

    // AIDEV-NOTE: Use upsert to handle both insert and update
    for (const cue of uniqueCues) {
      this.db
        .insert(schema.cuePoints)
        .values(cue as any)
        .onConflictDoUpdate({
          target: schema.cuePoints.id,
          set: {
            trackId: cue.trackId,
            type: cue.type as any,
            positionMs: cue.positionMs,
            lengthMs: cue.lengthMs ?? null,
            hotcueSlot: cue.hotcueSlot ?? null,
            name: cue.name ?? null,
            color: cue.color ?? null,
            order: cue.order ?? null,
          },
        })
        .run();
    }

    if (duplicatesRemoved > 0) {
      log.warn(`[db] Saved ${uniqueCues.length} cue points (${duplicatesRemoved} duplicates removed)`);
    } else {
      log.info(`[db] Saved ${uniqueCues.length} cue points`);
    }
  }

  /**
   * Delete all cue points for a track
   */
  public async deleteCuePointsByTrackId(trackId: TrackId): Promise<void> {
    this.db.delete(schema.cuePoints).where(eq(schema.cuePoints.trackId, trackId)).run();
    log.info(`[db] Deleted cue points for track ${trackId}`);
  }

  /**
   * Delete specific cue points by ID
   */
  public async deleteCuePoints(cuePointIds: string[]): Promise<void> {
    if (cuePointIds.length === 0) return;
    this.db.delete(schema.cuePoints).where(inArray(schema.cuePoints.id, cuePointIds)).run();
    log.info(`[db] Deleted ${cuePointIds.length} cue points`);
  }

  /**
   * Remove duplicate cue points from the database.
   * Duplicates are cue points with same trackId + positionMs + type + hotcueSlot.
   * Keeps the first cue point and deletes the rest.
   * @returns Number of duplicate cue points removed
   */
  public async cleanupDuplicateCuePoints(): Promise<number> {
    // Get all cue points
    const allCues = this.db
      .select()
      .from(schema.cuePoints)
      .orderBy(asc(schema.cuePoints.trackId), asc(schema.cuePoints.positionMs))
      .all();

    // Find duplicates: group by trackId+positionMs+type+hotcueSlot
    const seen = new Map<string, string>(); // key -> first cue id
    const duplicateIds: string[] = [];

    for (const cue of allCues) {
      const key = `${cue.trackId}-${cue.positionMs}-${cue.type}-${cue.hotcueSlot ?? -1}`;
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        duplicateIds.push(cue.id);
      } else {
        seen.set(key, cue.id);
      }
    }

    if (duplicateIds.length > 0) {
      this.db.delete(schema.cuePoints).where(inArray(schema.cuePoints.id, duplicateIds)).run();
      log.info(`[db] Cleaned up ${duplicateIds.length} duplicate cue points`);
    }

    return duplicateIds.length;
  }

  /**
   * Replace all cue points for a track (delete existing, insert new)
   * AIDEV-NOTE: Useful for Traktor sync - complete replacement strategy
   */
  public async replaceCuePointsForTrack(trackId: TrackId, cuePoints: CuePoint[]): Promise<void> {
    // Delete existing
    this.db.delete(schema.cuePoints).where(eq(schema.cuePoints.trackId, trackId)).run();

    // Insert new if any
    if (cuePoints.length > 0) {
      this.db
        .insert(schema.cuePoints)
        .values(cuePoints as any)
        .run();
    }

    log.info(`[db] Replaced cue points for track ${trackId} with ${cuePoints.length} new cue points`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AIDEV-NOTE: Folder Methods - For Traktor playlist hierarchy
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all folders with optional parent/children relations
   */
  public async getAllFolders(): Promise<Folder[]> {
    return this.db.select().from(schema.folders).orderBy(asc(schema.folders.path)).all() as Folder[];
  }

  /**
   * Get folder tree structure (root folders with children)
   */
  public async getFolderTree(): Promise<Folder[]> {
    // AIDEV-NOTE: Get root folders (no parent) with eager-loaded children and playlists
    return this.db.query.folders
      .findMany({
        where: (folders, { isNull }) => isNull(folders.parentId),
        with: {
          children: true,
          playlists: true,
        },
        orderBy: (folders, { asc }) => [asc(folders.name)],
      })
      .sync() as Folder[];
  }

  /**
   * Get a folder by ID
   */
  public async getFolderById(folderId: string): Promise<Folder | null> {
    const folder = this.db.query.folders
      .findFirst({
        where: (folders, { eq }) => eq(folders.id, folderId),
        with: {
          children: true,
          playlists: true,
        },
      })
      .sync();

    return (folder as Folder) || null;
  }

  /**
   * Get folder by path
   */
  public async getFolderByPath(path: string): Promise<Folder | null> {
    const folder = this.db.select().from(schema.folders).where(eq(schema.folders.path, path)).get();

    return (folder as Folder) || null;
  }

  /**
   * Insert or update folders
   */
  public async saveFolders(folders: Folder[]): Promise<void> {
    if (folders.length === 0) return;

    // AIDEV-NOTE: Upsert each folder
    for (const folder of folders) {
      this.db
        .insert(schema.folders)
        .values({
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId || null,
          path: folder.path || null,
        })
        .onConflictDoUpdate({
          target: schema.folders.id,
          set: {
            name: folder.name,
            parentId: folder.parentId || null,
            path: folder.path || null,
          },
        })
        .run();
    }

    log.info(`[db] Saved ${folders.length} folders`);
  }

  /**
   * Create a single folder
   */
  public async createFolder(folder: Folder): Promise<Folder> {
    this.db
      .insert(schema.folders)
      .values({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId || null,
        path: folder.path || null,
      })
      .run();

    // Return the created folder
    const created = this.db.select().from(schema.folders).where(eq(schema.folders.id, folder.id)).get();

    return created as Folder;
  }

  /**
   * Delete a folder by ID
   * AIDEV-NOTE: Cascades to child folders if configured, but playlists should be reassigned first
   */
  public async deleteFolder(folderId: string): Promise<void> {
    this.db.delete(schema.folders).where(eq(schema.folders.id, folderId)).run();
    log.info(`[db] Deleted folder ${folderId}`);
  }

  /**
   * Delete all folders (for clean sync)
   */
  public async clearAllFolders(): Promise<void> {
    this.db.delete(schema.folders).run();
    log.info('[db] Cleared all folders');
  }

  /**
   * Get playlists by folder ID
   */
  public async getPlaylistsByFolderId(folderId: string): Promise<Playlist[]> {
    const playlists = this.db.query.playlists
      .findMany({
        where: (playlists, { eq }) => eq(playlists.folderId, folderId),
        with: {
          playlistTracks: {
            with: { track: true },
            orderBy: (pt, { asc }) => [asc(pt.order)],
          },
        },
      })
      .sync();

    return playlists.map(p => this.mapPlaylistToTracks(p));
  }

  /**
   * Update playlist's folder assignment
   */
  public async setPlaylistFolder(playlistId: string, folderId: string | null): Promise<void> {
    this.db.update(schema.playlists).set({ folderId }).where(eq(schema.playlists.id, playlistId)).run();

    log.info(`[db] Playlist ${playlistId} moved to folder ${folderId ?? 'root'}`);
  }
}

export type DatabaseType = typeof Database;
