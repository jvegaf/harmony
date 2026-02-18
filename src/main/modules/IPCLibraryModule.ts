import fs from 'fs';
import path from 'path';
import log from 'electron-log';

import { BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { globby } from 'globby';
import * as mmd from 'music-metadata';
import queue from 'queue';

import { Track, UpdateRatingPayload, LibraryChanges } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import channels from '../../preload/lib/ipc-channels';
import { makeTrackID } from '../lib/track-id';
import { ParseDuration } from '../../preload/utils';
import { loggerExtras } from '../lib/log/logger';
import { emitLibraryChanged } from '../lib/library-events';
import UpdateTrackRating from '../lib/track/rating-manager';
import PersistTrack from '../lib/track/saver';
import RemoveFile from '../lib/track/remover';

interface ScanFile {
  path: string;
  stat: fs.Stats;
}

/*
|--------------------------------------------------------------------------
| supported Formats
|--------------------------------------------------------------------------
*/

const SUPPORTED_TRACKS_EXTENSIONS = [
  // MP3 / MP4
  '.mp3',
  '.mp4',
  '.aac',
  '.m4a',
  '.3gp',
  '.wav',
  // Opus
  '.ogg',
  '.ogv',
  '.ogm',
  '.opus',
  // Flac
  '.flac',
  // web media
  '.webm',
];

/**
 * Module in charge of renderer <> main processes communication regarding
 * library management, covers, playlists etc.
 */
class IPCLibraryModule extends ModuleWindow {
  public import: {
    processed: number;
    total: number;
  };

  constructor(window: BrowserWindow) {
    super(window);

    this.import = {
      processed: 0,
      total: 0,
    };
  }

  async load(): Promise<void> {
    ipcMain.handle(channels.LIBRARY_IMPORT_TRACKS, this.importTracks.bind(this));
    ipcMain.handle(channels.LIBRARY_LOOKUP, this.libraryLookup.bind(this));
    ipcMain.handle(channels.LIBRARY_CHECK_CHANGES, this.checkLibraryChanges.bind(this));
    ipcMain.handle(channels.LIBRARY_IMPORT_FULL, this.importLibraryFull.bind(this));
    ipcMain.handle(channels.TRACK_REPLACE_FILE, this.replaceTrackFile.bind(this));
    ipcMain.on(channels.TRACK_UPDATE_RATING, (_: IpcMainEvent, payload: UpdateRatingPayload) =>
      UpdateTrackRating(payload),
    );
    ipcMain.on(channels.TRACK_UPDATE_METADATA, (_: IpcMainEvent, track: Track) => PersistTrack(track));
    ipcMain.handle(channels.TRACKS_UPDATE_METADATA_BATCH, async (_: IpcMainInvokeEvent, tracks: Track[]) => {
      log.info(`Batch updating metadata for ${tracks.length} tracks`);
      const results = await Promise.allSettled(tracks.map(track => PersistTrack(track)));
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      log.info(`Batch metadata update complete: ${succeeded} succeeded, ${failed} failed`);
      return { succeeded, failed };
    });
    ipcMain.on(channels.TRACKS_DELETE, (_: IpcMainEvent, trackFiles: Track[]) => {
      trackFiles.forEach(t => RemoveFile(t.path));

      // Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);
      emitLibraryChanged('tracks-removed', trackFiles.length);
    });
  }

  // ---------------------------------------------------------------------------
  // IPC Events
  // ---------------------------------------------------------------------------

  /**
   * Scan the file system and return all music files that may be
   * safely imported to Harmony.
   */
  private async libraryLookup(_e: IpcMainInvokeEvent, pathsToScan: string[]): Promise<string[]> {
    log.info('Starting tracks lookup', pathsToScan);
    // 1. Get the stats for all the files/paths
    const paths = await Promise.all(pathsToScan.map(this.getStats));

    // 2. Split directories and files
    const files: string[] = [];
    const folders: string[] = [];

    paths.forEach(elem => {
      if (elem.stat.isFile()) files.push(elem.path);
      if (elem.stat.isDirectory() || elem.stat.isSymbolicLink()) folders.push(elem.path);
    });

    // 3. Scan all the directories with globby
    const globbies = folders.map(folder => {
      // Normalize slashes and escape regex special characters
      const pattern = `${folder
        .replace(/\\/g, '/')
        // I'm not sure about this eslint-ignore
        // eslint-disable-next-line no-useless-escape
        .replace(/([$^*+?()\[\]])/g, '\\$1')}/**/*.*`;

      return globby(pattern, { followSymbolicLinks: true });
    });

    const subDirectoriesFiles = await Promise.all(globbies);
    // Scan folders and add files to library

    // 4. Merge all path arrays together and filter them with the extensions we support
    const allFiles = subDirectoriesFiles.reduce((acc, array) => acc.concat(array), [] as string[]).concat(files); // Add the initial files

    const supportedTrackFiles = allFiles.filter(filePath => {
      const extension = path.extname(filePath).toLowerCase();
      return SUPPORTED_TRACKS_EXTENSIONS.includes(extension);
    });

    loggerExtras.timeEnd('Library lookup');

    return supportedTrackFiles;
  }

  /**
   * Unified library import: scan, import metadata, and insert tracks.
   * Orchestrates the entire import workflow in the main process, reducing IPC round-trips.
   *
   * DEBT-001: This method moves the orchestration logic from renderer to main process,
   * simplifying the renderer and improving performance by eliminating multiple IPC calls.
   *
   * Progress is reported via LIBRARY_IMPORT_PROGRESS events sent to the renderer.
   *
   * @param pathsToScan - Array of file/folder paths to scan for music files
   * @returns Object with success flag, count of tracks added, and optional error
   */
  private async importLibraryFull(
    _e: IpcMainInvokeEvent,
    pathsToScan: string[],
  ): Promise<{ success: boolean; tracksAdded: number; error?: string }> {
    try {
      log.info('[ImportLibraryFull] Starting unified library import', pathsToScan);

      // Step 1: Scan filesystem for supported audio files
      this.window.webContents.send(channels.LIBRARY_IMPORT_PROGRESS, {
        step: 'scanning',
        processed: 0,
        total: 0,
        message: 'Scanning filesystem...',
      });

      const filePaths = await this.libraryLookup(_e, pathsToScan);
      log.info(`[ImportLibraryFull] Found ${filePaths.length} audio files`);

      if (filePaths.length === 0) {
        log.info('[ImportLibraryFull] No audio files found');
        return { success: true, tracksAdded: 0 };
      }

      // Step 2: Import metadata (with DEBT-002 optimization - skips existing tracks)
      this.window.webContents.send(channels.LIBRARY_IMPORT_PROGRESS, {
        step: 'importing',
        processed: 0,
        total: filePaths.length,
        message: 'Reading track metadata...',
      });

      const tracks = await this.importTracks(_e, filePaths);
      log.info(`[ImportLibraryFull] Imported metadata for ${tracks.length} new tracks`);

      if (tracks.length === 0) {
        log.info('[ImportLibraryFull] All tracks already in database, nothing to add');
        this.window.webContents.send(channels.LIBRARY_IMPORT_PROGRESS, {
          step: 'complete',
          processed: 0,
          total: 0,
          message: 'All tracks already imported',
        });
        return { success: true, tracksAdded: 0 };
      }

      // Step 3: Insert tracks into database
      this.window.webContents.send(channels.LIBRARY_IMPORT_PROGRESS, {
        step: 'saving',
        processed: 0,
        total: tracks.length,
        message: 'Saving tracks to database...',
      });

      const db = (await import('../lib/db/database')).Database.getInstance();
      await db.insertTracks(tracks as Track[]);

      log.info(`[ImportLibraryFull] Successfully inserted ${tracks.length} tracks`);

      // Step 4: Emit library change event for auto-sync
      emitLibraryChanged('tracks-added', tracks.length);

      // Step 5: Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);

      // Step 6: Send completion event
      this.window.webContents.send(channels.LIBRARY_IMPORT_PROGRESS, {
        step: 'complete',
        processed: tracks.length,
        total: tracks.length,
        message: `Successfully imported ${tracks.length} tracks`,
      });

      return { success: true, tracksAdded: tracks.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('[ImportLibraryFull] Import failed:', error);

      this.window.webContents.send(channels.LIBRARY_IMPORT_PROGRESS, {
        step: 'error',
        processed: 0,
        total: 0,
        message: `Import failed: ${errorMessage}`,
      });

      return { success: false, tracksAdded: 0, error: errorMessage };
    }
  }

  /**
   * Import tracks metadata from file paths.
   *
   * Pre-filters paths that already exist in DB before scanning metadata.
   * This optimization avoids expensive file I/O and metadata parsing for tracks
   * that are already imported.
   */
  async importTracks(_e: IpcMainInvokeEvent, tracksPath: string[]): Promise<Array<Partial<Track>>> {
    log.info(`Starting import of ${tracksPath.length} tracks`);
    loggerExtras.time('Tracks scan');

    // Pre-filter optimization - check DB for existing paths
    // This avoids scanning metadata for tracks that are already imported
    const db = (await import('../lib/db/database')).Database.getInstance();
    const resolvedPaths = tracksPath.map(p => path.resolve(p));
    const existingTracks = await db.findTracksByPath(resolvedPaths);

    // Build set of existing paths (normalized for case-insensitive comparison on Windows/macOS)
    const existingPathsSet = new Set(
      existingTracks.map(t => (process.platform !== 'linux' ? t.path.toLowerCase() : t.path)),
    );

    // Filter to only paths that don't exist yet
    const pathsToImport = resolvedPaths.filter(p => {
      const normalized = process.platform !== 'linux' ? p.toLowerCase() : p;
      return !existingPathsSet.has(normalized);
    });

    const skippedCount = tracksPath.length - pathsToImport.length;
    if (skippedCount > 0) {
      log.info(`Pre-filter: Skipping ${skippedCount} already imported tracks`);
    }

    if (pathsToImport.length === 0) {
      log.info('All tracks already imported, skipping metadata scan');
      loggerExtras.timeEnd('Tracks scan');
      return [];
    }

    return new Promise((resolve, reject) => {
      try {
        // Instantiate queue
        const scannedFiles: Array<Partial<Track>> = [];

        const scanQueue = new queue();
        scanQueue.concurrency = 32;
        scanQueue.autostart = false;

        scanQueue.addEventListener('end', () => {
          this.import.processed = 0;
          this.import.total = 0;

          loggerExtras.timeEnd('Tracks scan');
          resolve(scannedFiles);
        });
        // End queue instantiation

        this.import.total += pathsToImport.length;

        // Add all the items to the queue (only new paths)
        pathsToImport.forEach((filePath, index) => {
          scanQueue.push(async callback => {
            try {
              // Path already resolved above
              // Get metadata
              const track = await this.getMetadata(filePath);
              scannedFiles.push(track);

              this.import.processed++;
            } catch (err) {
              log.warn(err);
            } finally {
              if (index % 50 == 0) {
                log.debug(`Finished scanning ${index} tracks`);
              }
            }

            if (callback) callback();
          });
        });

        scanQueue.start();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseMusicMetadata(data: mmd.IAudioMetadata, trackPath: string): Partial<Track> {
    const { common, format } = data;

    const title: string = common.title || path.parse(trackPath).base.split('.').slice(0, -1).join('.'); // Remove extension from filename if title tag is not present
    const rating = common.rating ? common.rating[0] : undefined;
    const rate = rating ? { ...rating, rating: Math.round(rating.rating * 5) } : undefined;

    const metadata = {
      album: common.album,
      artist: (common.artists && common.artists.join(', ')) || common.artist || common.albumartist,
      bpm: common.bpm,
      initialKey: common.key,
      duration: format.duration || 0,
      time: ParseDuration(format.duration || 0),
      genre: common.genre?.join(', '),
      comment: common.comment?.join(', '),
      bitrate: Math.round(format.bitrate! / 1000),
      title: title,
      label: common.label?.join(', '),
      year: common.year,
      rating: rate,
      url: common.website,
    };

    return metadata;
  }

  /**
   * Get a file ID3 metadata.
   *
   * Uses makeTrackID() for deterministic ID generation based on file path.
   * This ensures the same file always gets the same ID regardless of import source.
   */
  private async getMetadata(trackPath: string): Promise<Track> {
    const data = await mmd.parseFile(trackPath, {
      skipCovers: true,
      duration: true,
    });

    // Let's try to define something with what we got so far...
    const parsedData = this.parseMusicMetadata(data, trackPath);

    const trackId = makeTrackID(trackPath);

    const metadata: Partial<Track> = {
      ...parsedData,
      id: trackId,
      path: trackPath,
      addedAt: Date.now(), // Timestamp when track was imported
    };

    // Let's try another wat to retrieve a track duration
    // if (metadata.duration < 0.5) {
    //   try {
    //     metadata.duration = await getAudioDuration(trackPath);
    //   } catch (err) {
    //     logger.warn(`An error occured while getting ${trackPath} duration: ${err}`);
    //   }
    // }

    return metadata as Track;
  }

  /**
   * Replace a track file on disk with a new file, re-read metadata, and update database.
   * Validates same extension, copies new file over old path,
   * re-reads metadata, updates DB, and marks pending Traktor sync.
   */
  private async replaceTrackFile(
    _e: IpcMainInvokeEvent,
    trackId: string,
    trackPath: string,
    newFilePath: string,
  ): Promise<Track> {
    try {
      log.info(`[File Replacement] Starting replacement for track ${trackId}`);
      log.info(`[File Replacement] Old path: ${trackPath}`);
      log.info(`[File Replacement] New path: ${newFilePath}`);

      // 1. Validate same extension
      const oldExt = path.extname(trackPath).toLowerCase();
      const newExt = path.extname(newFilePath).toLowerCase();
      if (oldExt !== newExt) {
        const error = `Extension mismatch: old file is ${oldExt}, new file is ${newExt}. Only same extension replacement is allowed.`;
        log.error(`[File Replacement] ${error}`);
        throw new Error(error);
      }

      // 2. Copy new file over old path (overwrites old file)
      await fs.promises.copyFile(newFilePath, trackPath);
      log.info(`[File Replacement] File copied successfully`);

      // 3. Re-read metadata from the new file
      const freshMetadata = await this.getMetadata(trackPath);
      log.info(
        `[File Replacement] Metadata re-read: duration=${freshMetadata.duration}s, bitrate=${freshMetadata.bitrate}kbps`,
      );

      // 4. Preserve identity fields (id, path, addedAt stay the same)
      const updatedTrack: Track = {
        ...freshMetadata,
        id: trackId, // Keep original ID (same path = same hash)
        path: trackPath, // Keep original path
        // addedAt is already set by getMetadata, but we should preserve the original
      };

      // Get the original addedAt from database
      const db = (await import('../lib/db/database')).Database.getInstance();
      const originalTrack = await db.findTrackByID(trackId);
      if (originalTrack) {
        updatedTrack.addedAt = originalTrack.addedAt;
      }

      // 5. Update database
      await db.updateTrack(updatedTrack);
      log.info(`[File Replacement] Database updated for track ${trackId}`);

      // 6. Emit library change event to mark pending Traktor sync
      emitLibraryChanged('tracks-updated', 1);
      log.info(`[File Replacement] Library change event emitted`);

      // 7. Invalidate duplicates cache since file changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);

      return updatedTrack;
    } catch (error) {
      log.error(`[File Replacement] Failed to replace file for track ${trackId}:`, error);
      throw error;
    }
  }

  /**
   * Get stats of a file while keeping the path itself
   */
  private async getStats(folderPath: string): Promise<ScanFile> {
    return {
      path: folderPath,
      stat: await fs.promises.stat(folderPath),
    };
  }

  /**
   * Check for changes in the library path compared to the database.
   * Detects new files added by user and tracks whose files no longer exist.
   *
   * Reuses libraryLookup logic for filesystem scanning and
   * compares with database state to identify additions and removals.
   */
  private async checkLibraryChanges(_e: IpcMainInvokeEvent, libraryPath: string): Promise<LibraryChanges> {
    log.info('Starting library changes check', libraryPath);

    // 1. Scan filesystem for all supported audio files
    const filesInFilesystem = await this.libraryLookup(_e, [libraryPath]);
    log.info(`Found ${filesInFilesystem.length} audio files in filesystem`);

    // 2. Get all tracks from database
    const db = (await import('../lib/db/database')).Database.getInstance();
    const tracksInDb = await db.getAllTracks();
    log.info(`Found ${tracksInDb.length} tracks in database`);

    // 3. Build sets for comparison (case-insensitive on Windows/macOS)
    const isLinux = process.platform === 'linux';
    const filesystemSet = new Set(
      filesInFilesystem.map(p => (isLinux ? path.resolve(p) : path.resolve(p).toLowerCase())),
    );
    const dbPathsMap = new Map(tracksInDb.map(t => [isLinux ? t.path : t.path.toLowerCase(), t]));

    // 4. Find new files (in filesystem but not in DB)
    const added: string[] = [];
    for (const filePath of filesInFilesystem) {
      const normalizedPath = isLinux ? path.resolve(filePath) : path.resolve(filePath).toLowerCase();
      if (!dbPathsMap.has(normalizedPath)) {
        added.push(path.resolve(filePath)); // Use original case for the result
      }
    }

    // 5. Find removed files (in DB but not in filesystem)
    const removed: LibraryChanges['removed'] = [];
    for (const [normalizedPath, track] of dbPathsMap.entries()) {
      // Check if file still exists in the scanned filesystem
      if (!filesystemSet.has(normalizedPath)) {
        // Double-check with fs.existsSync to avoid false positives
        // (file might be outside the library path)
        if (!fs.existsSync(track.path)) {
          removed.push({
            id: track.id,
            path: track.path,
            title: track.title,
            artist: track.artist,
          });
        }
      }
    }

    log.info(`Library changes: ${added.length} new files, ${removed.length} missing files`);

    return { added, removed };
  }
}

export default IPCLibraryModule;
