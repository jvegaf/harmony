/**
 * Track Merge Utilities
 *
 * Smart merging and deduplication for track imports.
 *
 * AIDEV-NOTE: Core utilities for preventing duplicate tracks during import.
 * Used by both filesystem scanner (IPCLibraryModule) and Traktor sync (IPCTraktorModule).
 *
 * Key behaviors:
 * - Smart merge fills empty fields, never overwrites existing data
 * - Path-based deduplication with case-sensitivity handling per OS
 * - Preserves existing track IDs during merge
 */

import type { Track } from '../../preload/types/harmony';

/**
 * Result of smart merging two tracks
 */
export interface SmartMergeResult {
  /** The merged track with filled fields */
  track: Track;
  /** Whether any fields were changed */
  hasChanges: boolean;
}

/**
 * Result of deduplicating and merging track arrays
 */
export interface DeduplicateResult {
  /** Tracks that don't exist in the existing collection */
  newTracks: Track[];
  /** Tracks that exist and have been merged with new data */
  tracksToUpdate: Track[];
}

/**
 * Smart merge: fill empty fields of `existing` with values from `incoming`.
 * Never overwrites non-empty existing values.
 *
 * AIDEV-NOTE: This is the core merge strategy for handling duplicate imports.
 * When a track is imported that already exists (same path), we use this to
 * fill in any missing metadata from the new source without losing existing data.
 *
 * @param existing - Track already in the database
 * @param incoming - Track being imported
 * @returns Merged track and whether any changes were made
 */
export function smartMergeTrack(existing: Track, incoming: Track): SmartMergeResult {
  const merged = { ...existing };
  let hasChanges = false;

  // AIDEV-NOTE: Fields eligible for smart merge
  // id and path are always preserved from existing
  // duration and title are required fields, preserved from existing
  const fieldsToMerge: Array<keyof Track> = [
    'artist',
    'album',
    'genre',
    'year',
    'bpm',
    'initialKey',
    'bitrate',
    'comment',
    'label',
    'rating',
  ];

  for (const field of fieldsToMerge) {
    // Fill field if existing is undefined/null and incoming has a value
    if (
      (existing[field] === undefined || existing[field] === null) &&
      incoming[field] !== undefined &&
      incoming[field] !== null
    ) {
      // @ts-expect-error - TypeScript can't narrow the union type here
      merged[field] = incoming[field];
      hasChanges = true;
    }
  }

  return { track: merged, hasChanges };
}

/**
 * Deduplicate and merge tracks based on file path.
 *
 * AIDEV-NOTE: This function implements the core deduplication logic used during import.
 * It identifies which tracks are truly new vs duplicates, and applies smart merge to
 * duplicates that have missing metadata.
 *
 * Path comparison:
 * - Case-insensitive on Windows/macOS (caseInsensitive=true)
 * - Case-sensitive on Linux (caseInsensitive=false)
 *
 * @param existing - Tracks already in the database
 * @param incoming - Tracks being imported
 * @param caseInsensitive - Use case-insensitive path comparison (default: based on OS)
 * @returns Categorized tracks: new vs to-update
 */
export function deduplicateAndMergeTracks(
  existing: Track[],
  incoming: Track[],
  caseInsensitive: boolean = process.platform !== 'linux',
): DeduplicateResult {
  const newTracks: Track[] = [];
  const tracksToUpdate: Track[] = [];

  // Build lookup map of existing tracks by normalized path
  const existingByPath = new Map<string, Track>();
  for (const track of existing) {
    const normalizedPath = caseInsensitive ? track.path.toLowerCase() : track.path;
    existingByPath.set(normalizedPath, track);
  }

  // Categorize incoming tracks
  for (const incomingTrack of incoming) {
    const normalizedPath = caseInsensitive ? incomingTrack.path.toLowerCase() : incomingTrack.path;
    const existingTrack = existingByPath.get(normalizedPath);

    if (!existingTrack) {
      // Track doesn't exist - will be inserted
      newTracks.push(incomingTrack);
    } else {
      // Track exists - check if we can merge any fields
      const mergeResult = smartMergeTrack(existingTrack, incomingTrack);
      if (mergeResult.hasChanges) {
        tracksToUpdate.push(mergeResult.track);
      }
      // If no changes, don't add to either array
    }
  }

  return { newTracks, tracksToUpdate };
}
