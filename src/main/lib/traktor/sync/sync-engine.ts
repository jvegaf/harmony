/**
 * Sync Engine
 *
 * Orchestrates the synchronization between Traktor NML and Harmony database.
 *
 * AIDEV-NOTE: Main responsibilities:
 * 1. Match tracks by file path
 * 2. Merge metadata using conflict resolver
 * 3. Sync cue points per track
 * 4. Prepare sync plans for preview before applying
 */

import type { Track } from '../../../../preload/types/harmony';
import type { CuePoint } from '../../../../preload/types/cue-point';
import { mergeTrack, mergeCuePoints, MergeStrategy, type CueMergeStrategy } from './conflict-resolver';

/**
 * Sync engine options
 */
export interface SyncOptions {
  /** Track metadata merge strategy */
  strategy?: MergeStrategy;
  /** Cue point merge strategy */
  cueStrategy?: CueMergeStrategy;
  /** Case-insensitive path matching (for Windows/macOS) */
  caseInsensitivePaths?: boolean;
}

/**
 * Result of syncing a single track
 */
export interface TrackSyncResult {
  /** The merged track */
  track: Track;
  /** Whether metadata was changed */
  metadataChanged: boolean;
  /** List of fields that were updated */
  fieldsUpdated: string[];
  /** Merged cue points (if provided) */
  cuePoints?: CuePoint[];
  /** Whether cue points were changed */
  cuePointsChanged?: boolean;
}

/**
 * Result of matching tracks by path
 */
export interface TrackMatchResult {
  /** Tracks matched between Harmony and Traktor */
  matched: Array<{ harmony: Track; traktor: Track }>;
  /** Harmony tracks with no Traktor match */
  unmatchedHarmony: Track[];
  /** Traktor tracks with no Harmony match */
  unmatchedTraktor: Track[];
}

/**
 * Sync plan for preview before applying
 */
export interface SyncPlan {
  /** Tracks that will be updated */
  tracksToUpdate: TrackSyncResult[];
  /** Tracks matched but with no changes */
  tracksWithNoChanges: Track[];
  /** Traktor tracks not found in Harmony (will be imported) */
  unmatchedTraktorTracks: Track[];
  /** Cue points for tracks to be imported (keyed by track path) */
  cuePointsForNewTracks: Map<string, CuePoint[]>;
  /** Summary statistics */
  summary: {
    totalMatched: number;
    tracksWithChanges: number;
    tracksWithNoChanges: number;
    unmatchedTraktor: number;
    /** Number of new tracks that will be imported */
    tracksToImport: number;
  };
}

/**
 * Full sync result
 */
export interface SyncResult {
  /** Tracks that were updated */
  tracksUpdated: Track[];
  /** Cue points that were updated */
  cuePointsUpdated: CuePoint[];
  /** New tracks that were imported from Traktor */
  tracksImported: Track[];
  /** Cue points for imported tracks */
  cuePointsImported: CuePoint[];
  /** Statistics */
  stats: {
    tracksProcessed: number;
    tracksUpdated: number;
    tracksImported: number;
    cuePointsAdded: number;
    fieldsUpdated: Record<string, number>;
    playlistsImported: number;
  };
}

/**
 * Sync Engine - orchestrates Traktor <-> Harmony synchronization
 */
export class SyncEngine {
  private options: SyncOptions;

  constructor(options: SyncOptions = {}) {
    this.options = {
      strategy: MergeStrategy.SMART_MERGE,
      cueStrategy: 'SMART_MERGE',
      caseInsensitivePaths: false,
      ...options,
    };
  }

  /**
   * Normalize a path for comparison
   */
  private normalizePath(path: string): string {
    let normalized = path;

    // Case-insensitive comparison if enabled
    if (this.options.caseInsensitivePaths) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Match tracks from Harmony and Traktor by file path
   */
  matchTracksByPath(harmonyTracks: Track[], traktorTracks: Track[]): TrackMatchResult {
    const matched: Array<{ harmony: Track; traktor: Track }> = [];
    const unmatchedHarmony: Track[] = [];
    const unmatchedTraktor: Track[] = [];

    // Build a map of Traktor tracks by normalized path
    const traktorByPath = new Map<string, Track>();
    for (const track of traktorTracks) {
      traktorByPath.set(this.normalizePath(track.path), track);
    }

    // Track which Traktor paths were matched
    const matchedTraktorPaths = new Set<string>();

    // Match Harmony tracks to Traktor tracks
    for (const harmonyTrack of harmonyTracks) {
      const normalizedPath = this.normalizePath(harmonyTrack.path);
      const traktorTrack = traktorByPath.get(normalizedPath);

      if (traktorTrack) {
        matched.push({ harmony: harmonyTrack, traktor: traktorTrack });
        matchedTraktorPaths.add(normalizedPath);
      } else {
        unmatchedHarmony.push(harmonyTrack);
      }
    }

    // Find unmatched Traktor tracks
    for (const track of traktorTracks) {
      const normalizedPath = this.normalizePath(track.path);
      if (!matchedTraktorPaths.has(normalizedPath)) {
        unmatchedTraktor.push(track);
      }
    }

    return { matched, unmatchedHarmony, unmatchedTraktor };
  }

  /**
   * Sync a single track's metadata and optionally cue points
   */
  syncTrack(harmony: Track, traktor: Track, harmonyCues?: CuePoint[], traktorCues?: CuePoint[]): TrackSyncResult {
    // Merge track metadata
    const mergeResult = mergeTrack(harmony, traktor, this.options.strategy);

    const result: TrackSyncResult = {
      track: mergeResult.merged,
      metadataChanged: mergeResult.hasChanges,
      fieldsUpdated: mergeResult.fieldsUpdated,
    };

    // Merge cue points if provided
    if (harmonyCues !== undefined && traktorCues !== undefined) {
      const cueMergeResult = mergeCuePoints(harmonyCues, traktorCues, harmony.id, this.options.cueStrategy);

      result.cuePoints = cueMergeResult.merged;
      result.cuePointsChanged = cueMergeResult.hasChanges;
    }

    return result;
  }

  /**
   * Prepare a sync plan for preview
   *
   * This allows the user to review what will be changed before applying.
   */
  prepareSyncPlan(
    harmonyTracks: Track[],
    traktorTracks: Track[],
    harmonyCuesByTrackId?: Map<string, CuePoint[]>,
    traktorCuesByPath?: Map<string, CuePoint[]>,
  ): SyncPlan {
    const matches = this.matchTracksByPath(harmonyTracks, traktorTracks);

    const tracksToUpdate: TrackSyncResult[] = [];
    const tracksWithNoChanges: Track[] = [];

    for (const { harmony, traktor } of matches.matched) {
      // Get cue points if available
      const harmonyCues = harmonyCuesByTrackId?.get(harmony.id) ?? [];
      const traktorCues = traktorCuesByPath?.get(this.normalizePath(traktor.path)) ?? [];

      const result = this.syncTrack(harmony, traktor, harmonyCues, traktorCues);

      if (result.metadataChanged || result.cuePointsChanged) {
        tracksToUpdate.push(result);
      } else {
        tracksWithNoChanges.push(harmony);
      }
    }

    // AIDEV-NOTE: Collect cue points for tracks that will be imported
    const cuePointsForNewTracks = new Map<string, CuePoint[]>();
    for (const track of matches.unmatchedTraktor) {
      const normalizedPath = this.normalizePath(track.path);
      const cues = traktorCuesByPath?.get(normalizedPath) ?? [];
      if (cues.length > 0) {
        cuePointsForNewTracks.set(track.path, cues);
      }
    }

    return {
      tracksToUpdate,
      tracksWithNoChanges,
      unmatchedTraktorTracks: matches.unmatchedTraktor,
      cuePointsForNewTracks,
      summary: {
        totalMatched: matches.matched.length,
        tracksWithChanges: tracksToUpdate.length,
        tracksWithNoChanges: tracksWithNoChanges.length,
        unmatchedTraktor: matches.unmatchedTraktor.length,
        tracksToImport: matches.unmatchedTraktor.length,
      },
    };
  }

  /**
   * Execute sync and return the changes
   *
   * AIDEV-NOTE: This does not persist to database - caller is responsible
   * for saving the returned tracks and cue points.
   */
  executeSync(
    harmonyTracks: Track[],
    traktorTracks: Track[],
    harmonyCuesByTrackId?: Map<string, CuePoint[]>,
    traktorCuesByPath?: Map<string, CuePoint[]>,
  ): SyncResult {
    const plan = this.prepareSyncPlan(harmonyTracks, traktorTracks, harmonyCuesByTrackId, traktorCuesByPath);

    const tracksUpdated: Track[] = [];
    const cuePointsUpdated: CuePoint[] = [];
    const fieldsUpdated: Record<string, number> = {};

    for (const result of plan.tracksToUpdate) {
      if (result.metadataChanged) {
        tracksUpdated.push(result.track);

        // Count field updates
        for (const field of result.fieldsUpdated) {
          fieldsUpdated[field] = (fieldsUpdated[field] || 0) + 1;
        }
      }

      if (result.cuePointsChanged && result.cuePoints) {
        cuePointsUpdated.push(...result.cuePoints);
      }
    }

    // AIDEV-NOTE: Include tracks to import and their cue points
    const tracksImported = plan.unmatchedTraktorTracks;
    const cuePointsImported: CuePoint[] = [];
    for (const [, cues] of plan.cuePointsForNewTracks) {
      cuePointsImported.push(...cues);
    }

    return {
      tracksUpdated,
      cuePointsUpdated,
      tracksImported,
      cuePointsImported,
      stats: {
        tracksProcessed: plan.summary.totalMatched + plan.summary.tracksToImport,
        tracksUpdated: tracksUpdated.length,
        tracksImported: tracksImported.length,
        cuePointsAdded: cuePointsUpdated.length + cuePointsImported.length,
        fieldsUpdated,
      },
    };
  }
}
