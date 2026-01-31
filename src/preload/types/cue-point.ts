/**
 * Cue Point Types for Harmony
 *
 * Represents cue points, hotcues, loops, and beatgrid markers.
 * Compatible with Traktor NML import/export.
 *
 * AIDEV-NOTE: Position values are in milliseconds for precision.
 * Traktor NML stores positions in milliseconds too.
 */

/**
 * Cue point type enumeration
 */
export enum CueType {
  /** Hot cue marker - jump to this position */
  HOT_CUE = 'hot_cue',
  /** Fade-in marker */
  FADE_IN = 'fade_in',
  /** Fade-out marker */
  FADE_OUT = 'fade_out',
  /** Load marker - default position when track loads */
  LOAD = 'load',
  /** Beatgrid marker - used for tempo/beat alignment */
  GRID = 'grid',
  /** Loop marker - has start and end positions */
  LOOP = 'loop',
}

/**
 * Represents a cue point within a track.
 */
export interface CuePoint {
  /** Unique identifier */
  id: string;
  /** Associated track ID */
  trackId: string;
  /** Type of cue point */
  type: CueType;
  /** Position in milliseconds from start of track */
  positionMs: number;
  /** Length in milliseconds (for loops) */
  lengthMs?: number;
  /** Hot cue slot number (0-7 typically) */
  hotcueSlot?: number;
  /** Display name/label */
  name?: string;
  /** Color (hex or named color) */
  color?: string;
  /** Display order for UI */
  order?: number;
  /**
   * Precise BPM for grid markers (TYPE=GRID).
   * AIDEV-NOTE: Traktor stores this in a nested <GRID BPM="..."> element.
   * Must be preserved for beatgrid alignment precision.
   */
  gridBpm?: string;
}

/**
 * Beatgrid information for a track.
 * The grid marker position + BPM defines the entire grid.
 */
export interface BeatGrid {
  /** First beat position in milliseconds */
  firstBeatMs: number;
  /** BPM at this grid point */
  bpm: number;
  /** Whether this was auto-detected or manually set */
  isManual?: boolean;
}
