import type { Track, TrackId } from './harmony';

/**
 * Duplicate detection result types.
 * These types are used for IPC communication between
 * main process (detection) and renderer (UI display).
 */

/**
 * Extended track info for duplicate comparison.
 * Includes additional metadata needed for the duplicate finder UI.
 */
export interface DuplicateTrackInfo {
  track: Track;
  /** File size in bytes */
  fileSize: number;
  /** Audio format (MP3, FLAC, AIFF, etc.) */
  format: string;
  /** Number of cue points on this track */
  cueCount: number;
  /** Number of playlists containing this track */
  playlistCount: number;
  /** Quality score for auto-selection (higher = better) */
  qualityScore: number;
}

/**
 * A group of tracks identified as duplicates of each other.
 * All tracks in a group are considered duplicates based on
 * the enabled detection criteria. UI displays these as expandable groups.
 */
export interface DuplicateGroup {
  /** Unique identifier for this group */
  id: string;
  /** Detection method that found this group (for display) */
  detectionMethod: 'title' | 'artist' | 'duration' | 'titleArtist' | 'titleDuration' | 'fingerprint' | 'multiple';
  /** Similarity score between tracks in this group (0-1) */
  similarity: number;
  /** All tracks in this duplicate group */
  tracks: DuplicateTrackInfo[];
  /** Track ID pre-selected as the "keeper" (highest quality) */
  suggestedKeeperId: TrackId;
}

/**
 * Result of a duplicate scan operation.
 */
export interface DuplicateScanResult {
  /** Total number of tracks scanned */
  totalTracks: number;
  /** Number of duplicate groups found */
  groupCount: number;
  /** Total number of tracks that are duplicates (excluding one per group) */
  duplicateCount: number;
  /** The duplicate groups */
  groups: DuplicateGroup[];
  /** Scan duration in milliseconds */
  scanDurationMs: number;
}

/**
 * Progress update during duplicate scan.
 * Sent via IPC event during scanning for UI progress bar.
 */
export interface DuplicateScanProgress {
  /** Current phase of the scan */
  phase: 'loading' | 'analyzing' | 'grouping' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
}

/**
 * File info returned when getting track file details.
 */
export interface TrackFileInfo {
  trackId: TrackId;
  fileSize: number;
  format: string;
  exists: boolean;
}
