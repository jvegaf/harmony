/**
 * Conflict Resolver
 *
 * Handles merge strategies for syncing Traktor data with Harmony.
 *
 * AIDEV-NOTE: The approved strategy is "smart merge":
 * - Traktor data fills empty Harmony fields
 * - Harmony data takes precedence when both have values
 * - Identity fields (id, path) always come from Harmony
 * - Cue points: if Harmony has cues, keep them; otherwise use Traktor's
 */

import type { Track } from '../../../../preload/types/harmony';
import type { CuePoint } from '../../../../preload/types/cue-point';

/**
 * Available merge strategies
 */
export enum MergeStrategy {
  /** Default: Traktor data fills empty Harmony fields */
  SMART_MERGE = 'SMART_MERGE',
  /** Traktor data overwrites Harmony data (except id/path) */
  TRAKTOR_WINS = 'TRAKTOR_WINS',
  /** Keep all Harmony data, ignore Traktor completely */
  HARMONY_WINS = 'HARMONY_WINS',
}

/**
 * Result of a track merge operation
 */
export interface MergeResult {
  /** The merged track */
  merged: Track;
  /** Whether any fields were changed */
  hasChanges: boolean;
  /** List of field names that were updated */
  fieldsUpdated: string[];
}

/**
 * Result of a cue point merge operation
 */
export interface CueMergeResult {
  /** The merged cue points */
  merged: CuePoint[];
  /** Whether any cue points were changed */
  hasChanges: boolean;
  /** Number of cue points added */
  added: number;
  /** Number of cue points removed */
  removed: number;
}

/**
 * Fields that can be merged from Traktor to Harmony
 * AIDEV-NOTE: Excludes id, path, duration, waveformPeaks which are Harmony-controlled
 */
const MERGEABLE_FIELDS: (keyof Track)[] = [
  'title',
  'artist',
  'album',
  'genre',
  'year',
  'bpm',
  'initialKey',
  'rating',
  'comment',
  'bitrate',
];

/**
 * Check if a value is considered "empty" (null, undefined, empty string, whitespace-only)
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

/**
 * Merge a Traktor track into a Harmony track.
 *
 * @param harmony - The existing Harmony track
 * @param traktor - The Traktor track data to merge
 * @param strategy - Merge strategy (default: SMART_MERGE)
 * @returns MergeResult with merged track and change info
 */
export function mergeTrack(
  harmony: Track,
  traktor: Track,
  strategy: MergeStrategy = MergeStrategy.SMART_MERGE,
): MergeResult {
  // Start with a copy of Harmony track (always preserve id, path, duration, waveformPeaks)
  const merged: Track = { ...harmony };
  const fieldsUpdated: string[] = [];

  // HARMONY_WINS: No changes, just return Harmony as-is
  if (strategy === MergeStrategy.HARMONY_WINS) {
    return {
      merged,
      hasChanges: false,
      fieldsUpdated: [],
    };
  }

  // Process each mergeable field
  for (const field of MERGEABLE_FIELDS) {
    const harmonyValue = harmony[field];
    const traktorValue = traktor[field];

    if (strategy === MergeStrategy.TRAKTOR_WINS) {
      // TRAKTOR_WINS: Always use Traktor value if it exists
      if (!isEmpty(traktorValue)) {
        (merged as any)[field] = traktorValue;
        if (harmonyValue !== traktorValue) {
          fieldsUpdated.push(field);
        }
      }
    } else {
      // SMART_MERGE: Only fill empty Harmony fields
      if (isEmpty(harmonyValue) && !isEmpty(traktorValue)) {
        (merged as any)[field] = traktorValue;
        fieldsUpdated.push(field);
      }
    }
  }

  return {
    merged,
    hasChanges: fieldsUpdated.length > 0,
    fieldsUpdated,
  };
}

/**
 * Cue point merge strategies
 */
export type CueMergeStrategy = 'SMART_MERGE' | 'REPLACE';

/**
 * Merge cue points from Traktor into Harmony.
 *
 * Default strategy (SMART_MERGE):
 * - If Harmony has cue points, keep them (no changes)
 * - If Harmony has no cue points, use Traktor's cue points
 *
 * REPLACE strategy:
 * - Always replace Harmony cue points with Traktor's
 *
 * @param harmonyCues - Existing Harmony cue points
 * @param traktorCues - Traktor cue points to merge
 * @param trackId - Track ID to assign to merged cue points
 * @param strategy - Merge strategy (default: SMART_MERGE)
 * @returns CueMergeResult with merged cue points and change info
 */
export function mergeCuePoints(
  harmonyCues: CuePoint[],
  traktorCues: CuePoint[],
  trackId: string,
  strategy: CueMergeStrategy = 'SMART_MERGE',
): CueMergeResult {
  // SMART_MERGE: Keep Harmony cues if any exist
  if (strategy === 'SMART_MERGE' && harmonyCues.length > 0) {
    return {
      merged: harmonyCues,
      hasChanges: false,
      added: 0,
      removed: 0,
    };
  }

  // If Harmony has no cues or REPLACE strategy, use Traktor cues
  if (strategy === 'REPLACE' || harmonyCues.length === 0) {
    // Assign correct trackId to all cue points
    const merged = traktorCues.map(cue => ({
      ...cue,
      trackId,
    }));

    const added = traktorCues.length;
    const removed = strategy === 'REPLACE' ? harmonyCues.length : 0;
    const hasChanges = added > 0 || removed > 0;

    return {
      merged,
      hasChanges,
      added,
      removed,
    };
  }

  // Fallback (shouldn't reach here)
  return {
    merged: harmonyCues,
    hasChanges: false,
    added: 0,
    removed: 0,
  };
}
