/**
 * Traktor Export Worker
 *
 * Worker thread for exporting Harmony data back to Traktor NML.
 * Runs XML generation and file writing in a separate thread to avoid
 * blocking the Electron main thread.
 *
 * Communication:
 * - Input: ExportWorkerInput with NML path, tracks, cue points, playlists
 * - Output: Progress messages + final ExportWorkerResult
 */

import { parentPort } from 'worker_threads';

import type { Track, Playlist } from '../../../../preload/types/harmony';
import type { CuePoint } from '../../../../preload/types/cue-point';
import { TraktorNMLParser } from '../nml-parser';
import { TraktorNMLWriter } from '../nml-writer';

/**
 * Input message to start export
 */
export interface ExportWorkerInput {
  type: 'export';
  nmlPath: string;
  harmonyTracks: Track[];
  /** Serialized Map: trackId -> CuePoint[] */
  harmonyCuesByTrackId: Record<string, CuePoint[]>;
  harmonyPlaylists: Playlist[];
  createBackup: boolean;
}

/**
 * Progress update message
 */
export interface ExportWorkerProgress {
  type: 'progress';
  phase: 'parsing' | 'building' | 'writing' | 'complete';
  progress: number; // 0-100
  message: string;
}

/**
 * Final result message
 */
export interface ExportWorkerResult {
  type: 'result';
  success: boolean;
  tracksExported: number;
  playlistsExported: number;
  backupPath?: string;
}

/**
 * Error message
 */
export interface ExportWorkerError {
  type: 'error';
  error: string;
  stack?: string;
}

export type ExportWorkerMessage = ExportWorkerProgress | ExportWorkerResult | ExportWorkerError;

/**
 * Send progress update to main thread
 */
function sendProgress(phase: ExportWorkerProgress['phase'], progress: number, message: string): void {
  const msg: ExportWorkerProgress = { type: 'progress', phase, progress, message };
  parentPort?.postMessage(msg);
}

/**
 * Send error to main thread
 */
function sendError(error: Error): void {
  const msg: ExportWorkerError = {
    type: 'error',
    error: error.message,
    stack: error.stack,
  };
  parentPort?.postMessage(msg);
}

/**
 * Normalize path for comparison (case-insensitive on Windows/macOS)
 */
function normalizePath(path: string): string {
  return process.platform === 'linux' ? path : path.toLowerCase();
}

/**
 * Convert Traktor path format to system path
 */
function traktorPathToSystem(dir: string, file: string): string {
  // Replace /: with / and remove trailing /:
  const systemDir = dir.replace(/\/:/g, '/').replace(/:$/, '');
  return `${systemDir}${file}`;
}

/**
 * Main export execution
 */
async function executeExport(input: ExportWorkerInput): Promise<void> {
  try {
    sendProgress('parsing', 0, 'Parsing existing NML file...');

    // Parse existing NML to preserve structure
    const parser = new TraktorNMLParser();
    const nml = await parser.parse(input.nmlPath);

    sendProgress('parsing', 20, 'NML parsed successfully');

    // Create path-indexed map of Harmony tracks
    const harmonyTracksByPath = new Map<string, Track>();
    for (const track of input.harmonyTracks) {
      const normalizedPath = normalizePath(track.path);
      harmonyTracksByPath.set(normalizedPath, track);
    }

    // Deserialize cues from Record to Map
    const cuesByTrackId = new Map<string, CuePoint[]>();
    for (const [trackId, cues] of Object.entries(input.harmonyCuesByTrackId)) {
      // Deduplicate cues by position+type+hotcue
      const uniqueCues: CuePoint[] = [];
      const seen = new Set<string>();

      for (const cue of cues) {
        const key = `${cue.positionMs}-${cue.type}-${cue.hotcueSlot ?? -1}`;
        if (!seen.has(key)) {
          uniqueCues.push(cue);
          seen.add(key);
        }
      }

      cuesByTrackId.set(trackId, uniqueCues);
    }

    sendProgress('building', 40, 'Building export data...');

    // Update NML with Harmony track data
    const writer = new TraktorNMLWriter();
    let updatedNml = nml;
    let tracksExported = 0;

    for (const entry of nml.NML.COLLECTION.ENTRY) {
      const entryPath = traktorPathToSystem(entry.LOCATION.DIR, entry.LOCATION.FILE);
      const normalizedPath = normalizePath(entryPath);
      const harmonyTrack = harmonyTracksByPath.get(normalizedPath);

      if (harmonyTrack) {
        const cues = cuesByTrackId.get(harmonyTrack.id);
        updatedNml = writer.updateTrack(updatedNml, harmonyTrack, cues);
        tracksExported++;
      }
    }

    sendProgress('building', 60, `Updated ${tracksExported} tracks`);

    // Merge Harmony playlists into NML
    let playlistsExported = 0;
    if (input.harmonyPlaylists.length > 0) {
      sendProgress('building', 65, 'Merging playlists...');
      updatedNml = writer.mergePlaylistsFromHarmony(updatedNml, input.harmonyPlaylists);
      playlistsExported = input.harmonyPlaylists.length;
      sendProgress('building', 70, `Merged ${playlistsExported} playlists`);
    } else {
      sendProgress('building', 70, 'No playlists to merge');
    }

    sendProgress('writing', 75, 'Preparing to write NML file...');

    // Create backup if requested
    let backupPath: string | undefined;
    if (input.createBackup) {
      sendProgress('writing', 80, 'Creating backup...');
      backupPath = `${input.nmlPath}.backup.${Date.now()}.nml`;
      const fs = await import('fs/promises');
      await fs.copyFile(input.nmlPath, backupPath);
      sendProgress('writing', 85, 'Backup created');
    } else {
      sendProgress('writing', 82, 'Skipping backup...');
    }

    // Write updated NML to file
    sendProgress('writing', 90, 'Writing NML file...');
    await writer.writeToFile(updatedNml, input.nmlPath);
    sendProgress('writing', 95, 'NML file written');

    sendProgress('complete', 100, 'Export complete');

    // Send result back to main thread
    const resultMsg: ExportWorkerResult = {
      type: 'result',
      success: true,
      tracksExported,
      playlistsExported,
      backupPath,
    };
    parentPort?.postMessage(resultMsg);
  } catch (error) {
    if (error instanceof Error) {
      sendError(error);
    } else {
      sendError(new Error(String(error)));
    }
  }
}

/**
 * Worker message handler
 */
if (parentPort) {
  parentPort.on('message', (message: ExportWorkerInput) => {
    if (message.type === 'export') {
      executeExport(message);
    }
  });
} else {
  throw new Error('This module must be run as a worker thread');
}
