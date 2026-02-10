import fs from 'fs';
import path from 'path';
import log from 'electron-log';

import { BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { globby } from 'globby';
import * as mmd from 'music-metadata';
import queue from 'queue';

import { Track, UpdateRatingPayload } from '../../preload/types/harmony';

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
    ipcMain.on(channels.TRACK_UPDATE_RATING, (_: IpcMainEvent, payload: UpdateRatingPayload) =>
      UpdateTrackRating(payload),
    );
    ipcMain.on(channels.TRACK_UPDATE_METADATA, (_: IpcMainEvent, track: Track) => PersistTrack(track));
    ipcMain.on(channels.TRACKS_DELETE, (_: IpcMainEvent, trackFiles: Track[]) => {
      trackFiles.forEach(t => RemoveFile(t.path));

      // Invalidate duplicates cache since library changed
      this.window.webContents.send(channels.DUPLICATES_INVALIDATE_CACHE);

      // AIDEV-NOTE: Emit library change event for auto-sync
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
   * Import tracks metadata from file paths.
   *
   * AIDEV-NOTE: Pre-filters paths that already exist in DB before scanning metadata.
   * This optimization avoids expensive file I/O and metadata parsing for tracks
   * that are already imported.
   */
  async importTracks(_e: IpcMainInvokeEvent, tracksPath: string[]): Promise<Array<Partial<Track>>> {
    log.info(`Starting import of ${tracksPath.length} tracks`);
    loggerExtras.time('Tracks scan');

    // AIDEV-NOTE: Pre-filter optimization - check DB for existing paths
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
      year: common.year,
      rating: rate,
    };

    return metadata;
  }

  /**
   * Get a file ID3 metadata
   *
   * AIDEV-NOTE: Uses makeTrackID() for deterministic ID generation based on file path.
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
   * Get stats of a file while keeping the path itself
   */
  private async getStats(folderPath: string): Promise<ScanFile> {
    return {
      path: folderPath,
      stat: await fs.promises.stat(folderPath),
    };
  }
}

export default IPCLibraryModule;
