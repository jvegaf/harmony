/**
 * Traktor Sync Worker
 *
 * Worker thread for executing CPU-intensive Traktor sync operations.
 * Runs parsing, track matching, and sync logic in a separate thread to avoid
 * blocking the Electron main thread.
 *
 * Communication:
 * - Input: SyncWorkerInput message with NML path, Harmony tracks, options
 * - Output: Progress messages + final SyncWorkerResult
 *
 * This worker does NOT interact with the database - the main thread handles
 * all TypeORM operations after receiving the sync result.
 */

import { parentPort } from 'worker_threads';
import { access } from 'fs/promises';

import type { Track } from '../../../../preload/types/harmony';
import type { CuePoint } from '../../../../preload/types/cue-point';
import { TraktorNMLParser } from '../nml-parser';
import { SyncEngine, type SyncOptions, type SyncResult } from './sync-engine';
import { mapTraktorEntryToTrack } from '../mappers/track-mapper';
import { mapTraktorCuesToHarmony } from '../mappers/cue-mapper';
import type { TraktorNML } from '../types/nml-types';

/**
 * Input message to start sync
 */
export interface SyncWorkerInput {
  type: 'sync';
  nmlPath: string;
  harmonyTracks: Track[];
  /** Serialized Map: trackId -> CuePoint[] */
  harmonyCuesByTrackId: Record<string, CuePoint[]>;
  options: SyncOptions;
}

/**
 * Progress update message
 */
export interface SyncWorkerProgress {
  type: 'progress';
  phase: 'parsing' | 'loading' | 'syncing' | 'validating' | 'complete';
  progress: number; // 0-100
  message: string;
}

/**
 * Final result message
 */
export interface SyncWorkerResult {
  type: 'result';
  result: SyncResult;
  /** Serialized Map: track path -> CuePoint[] */
  traktorCuesByPath: Record<string, CuePoint[]>;
  parsedNml: TraktorNML;
}

/**
 * Error message
 */
export interface SyncWorkerError {
  type: 'error';
  error: string;
  stack?: string;
}

export type SyncWorkerMessage = SyncWorkerProgress | SyncWorkerResult | SyncWorkerError;

/**
 * Send progress update to main thread
 */
function sendProgress(phase: SyncWorkerProgress['phase'], progress: number, message: string): void {
  const msg: SyncWorkerProgress = { type: 'progress', phase, progress, message };
  parentPort?.postMessage(msg);
}

/**
 * Send error to main thread
 */
function sendError(error: Error): void {
  const msg: SyncWorkerError = {
    type: 'error',
    error: error.message,
    stack: error.stack,
  };
  parentPort?.postMessage(msg);
}

/**
 * Normalize path for comparison (case-insensitive on Windows/macOS)
 */
function normalizePath(path: string, caseInsensitive: boolean): string {
  return caseInsensitive ? path.toLowerCase() : path;
}

/**
 * Main sync execution
 */
async function executeSync(input: SyncWorkerInput): Promise<void> {
  try {
    sendProgress('parsing', 0, 'Parsing Traktor NML file...');

    // Parse NML
    const parser = new TraktorNMLParser();
    const nml = await parser.parse(input.nmlPath);

    const entries = nml.NML.COLLECTION.ENTRY || [];
    const traktorTracks: Track[] = entries.map(entry => mapTraktorEntryToTrack(entry));

    sendProgress('parsing', 25, `Parsed ${traktorTracks.length} tracks from Traktor`);

    // Extract cue points from NML
    const traktorCuesByPath: Record<string, CuePoint[]> = {};
    for (const entry of entries) {
      const track = mapTraktorEntryToTrack(entry);
      if (entry.CUE_V2) {
        const cues = Array.isArray(entry.CUE_V2) ? entry.CUE_V2 : [entry.CUE_V2];
        const cuePoints = mapTraktorCuesToHarmony(cues, track.id);
        const normalizedPath = normalizePath(track.path, input.options.caseInsensitivePaths ?? false);
        traktorCuesByPath[normalizedPath] = cuePoints;
      }
    }

    sendProgress('loading', 50, 'Preparing sync...');

    // Deserialize harmonyCues from Record to Map
    const harmonyCuesByTrackId = new Map<string, CuePoint[]>();
    for (const [trackId, cues] of Object.entries(input.harmonyCuesByTrackId)) {
      harmonyCuesByTrackId.set(trackId, cues);
    }

    // Deserialize traktorCues from Record to Map
    const traktorCuesMap = new Map<string, CuePoint[]>();
    for (const [path, cues] of Object.entries(traktorCuesByPath)) {
      traktorCuesMap.set(path, cues);
    }

    sendProgress('syncing', 60, 'Analyzing differences...');

    // Execute sync engine
    const engine = new SyncEngine(input.options);
    const result = engine.executeSync(input.harmonyTracks, traktorTracks, harmonyCuesByTrackId, traktorCuesMap);

    sendProgress('validating', 80, 'Validating imported tracks...');

    // Validate that imported tracks exist on disk
    const validTracks: Track[] = [];
    const skippedCount = result.tracksImported.length;

    for (const track of result.tracksImported) {
      try {
        await access(track.path);
        validTracks.push(track);
      } catch {
        // Skip tracks whose files don't exist
      }
    }

    // Update result with only valid tracks
    result.tracksImported = validTracks;
    result.stats.tracksImported = validTracks.length;

    const skippedActual = skippedCount - validTracks.length;
    if (skippedActual > 0) {
      sendProgress('validating', 90, `Skipped ${skippedActual} tracks (files not found)`);
    }

    sendProgress('complete', 100, 'Sync complete');

    // Send result back to main thread
    const resultMsg: SyncWorkerResult = {
      type: 'result',
      result,
      traktorCuesByPath, // Keep as Record for serialization
      parsedNml: nml,
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
  parentPort.on('message', (message: SyncWorkerInput) => {
    if (message.type === 'sync') {
      executeSync(message);
    }
  });
} else {
  throw new Error('This module must be run as a worker thread');
}
