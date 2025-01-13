import fs from 'fs';
import path from 'path';
import log from 'electron-log';

import { BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { globby } from 'globby';
import * as mmd from 'music-metadata';
import queue from 'queue';

import { Track } from '../../preload/types/harmony';

import ModuleWindow from './BaseWindowModule';
import channels from '../../preload/lib/ipc-channels';
import makeID from '../../preload/lib/id-provider';
import { ParseDuration } from '../../preload/utils';
import { loggerExtras } from '../lib/log/logger';

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

const SUPPORTED_PLAYLISTS_EXTENSIONS = ['.m3u'];

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
  }

  // ---------------------------------------------------------------------------
  // IPC Events
  // ---------------------------------------------------------------------------

  /**
   * Scan the file system and return all music files and playlists that may be
   * safely imported to Harmony.
   */
  private async libraryLookup(_e: IpcMainInvokeEvent, pathsToScan: string[]): Promise<[string[], string[]]> {
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

    const supportedPlaylistsFiles = allFiles.filter(filePath => {
      const extension = path.extname(filePath).toLowerCase();
      return SUPPORTED_PLAYLISTS_EXTENSIONS.includes(extension);
    });

    loggerExtras.timeEnd('Library lookup');

    return [supportedTrackFiles, supportedPlaylistsFiles];
  }

  /**
   * Now: returns the id3 tags of all the given tracks path
   * Tomorrow: do DB insertion here
   */
  async importTracks(_e: IpcMainInvokeEvent, tracksPath: string[]): Promise<Array<Partial<Track>>> {
    log.info(`Starting import of ${tracksPath.length} tracks`);
    loggerExtras.time('Tracks scan');

    return new Promise((resolve, reject) => {
      if (tracksPath.length === 0) return;

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

        this.import.total += tracksPath.length;

        // Add all the items to the queue
        tracksPath.forEach((filePath, index) => {
          scanQueue.push(async callback => {
            try {
              // Normalize (back)slashes on Windows
              filePath = path.resolve(filePath);

              // Check if there is an existing record in the DB
              // const existingDoc = await db.tracks.findOnlyByPath(filePath);

              // If there is existing document
              // if (!existingDoc) {
              // Get metadata
              const track = await this.getMetadata(filePath);
              // const insertedDoc = await db.tracks.insert(track);
              scannedFiles.push(track);
              // }

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

    const title: string = common.title || path.parse(trackPath).base;
    const rating = common.rating ? common.rating[0] : undefined;

    const metadata = {
      album: common.album,
      artist: (common.artists && common.artists.join(', ')) || common.artist || common.albumartist,
      bpm: common.bpm,
      initialKey: common.key,
      duration: format.duration || 0,
      time: ParseDuration(format.duration || 0),
      genre: common.genre?.join(', '),
      comment: common.comment?.join(', '),
      bitrate: format.bitrate!,
      title: title,
      year: common.year,
      rating: rating,
    };

    return metadata;
  }

  /**
   * Get a file ID3 metadata
   */
  private async getMetadata(trackPath: string): Promise<Track> {
    const data = await mmd.parseFile(trackPath, {
      skipCovers: true,
      duration: true,
    });

    // Let's try to define something with what we got so far...
    const parsedData = this.parseMusicMetadata(data, trackPath);

    const trackId = makeID();

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
