/**
 * TypeScript interfaces for Traktor NML (Native Instruments Music Library) format.
 * Based on reverse-engineered XSD schema and real collection.nml data.
 *
 * These types match Traktor Pro 3.x NML format (VERSION="19").
 * All attributes are strings as they come from XML parsing.
 */

// ============================================================================
// Root NML Structure
// ============================================================================

export interface TraktorNML {
  NML: {
    VERSION: string;
    HEAD: TraktorHead;
    COLLECTION: TraktorCollection;
    PLAYLISTS?: TraktorPlaylists;
    SORTING_ORDER?: TraktorSortingOrder[];
    INDEXING?: TraktorIndexing; // Traktor uses this for sorting info, must be preserved
  };
}

/**
 * INDEXING section at the end of NML file.
 * Contains SORTING_INFO elements that Traktor uses for collection ordering.
 *
 * This section appears at the end of the NML file and must be preserved
 * for proper Traktor compatibility. Without it, Traktor may have issues reading the file.
 */
export interface TraktorIndexing {
  SORTING_INFO?: TraktorSortingInfo | TraktorSortingInfo[];
}

export interface TraktorSortingInfo {
  PATH: string; // e.g., "$COLLECTION", "Native Instruments"
  CRITERIA?: TraktorCriteria; // Optional sorting criteria
}

/**
 * Sorting criteria for a SORTING_INFO element.
 * Stores the column and direction used to sort a view.
 */
export interface TraktorCriteria {
  ATTRIBUTE: string; // Column to sort by: "TITLE", "ARTIST", "BPM", etc.
  DIRECTION: string; // "UP" (ascending) or "DOWN" (descending)
}

export interface TraktorHead {
  COMPANY: string;
  PROGRAM: string;
}

// ============================================================================
// Collection (Track Library)
// ============================================================================

export interface TraktorCollection {
  ENTRIES: string; // Number of entries as string
  ENTRY: TraktorEntry[];
}

export interface TraktorEntry {
  // Attributes on ENTRY element
  MODIFIED_DATE?: string; // Format: "2026/1/15"
  MODIFIED_TIME?: string; // Seconds since midnight as string
  AUDIO_ID?: string; // Base64 encoded audio fingerprint
  TITLE?: string;
  ARTIST?: string;

  // Child elements
  LOCATION: TraktorLocation;
  ALBUM?: TraktorAlbum;
  MODIFICATION_INFO?: TraktorModificationInfo;
  INFO?: TraktorInfo;
  TEMPO?: TraktorTempo;
  LOUDNESS?: TraktorLoudness;
  MUSICAL_KEY?: TraktorMusicalKey;
  CUE_V2?: TraktorCue | TraktorCue[]; // Can be single or array
  PRIMARYKEY?: TraktorPrimaryKey;
}

export interface TraktorLocation {
  DIR: string; // Format: "/:Users/:josev/:Music/:BOX/:2601/:"
  FILE: string; // Filename, may contain &amp; for &
  VOLUME: string; // Volume label, e.g., "C:"
  VOLUMEID?: string; // Volume ID hash
}

export interface TraktorAlbum {
  TITLE?: string;
  TRACK?: string; // Track number in album
  OF_TRACKS?: string; // Total tracks in album
}

export interface TraktorModificationInfo {
  AUTHOR_TYPE?: string; // e.g., "user"
}

export interface TraktorInfo {
  BITRATE?: string; // e.g., "320000" (bits per second)
  GENRE?: string;
  LABEL?: string; // Record label
  COMMENT?: string;
  COVERARTID?: string; // Cover art identifier
  KEY?: string; // Musical key in Traktor notation, e.g., "1m", "12d"
  PLAYTIME?: string; // Duration in seconds (integer)
  PLAYTIME_FLOAT?: string; // Duration in seconds (float)
  RANKING?: string; // 0-255 rating scale
  IMPORT_DATE?: string; // Format: "2026/1/15"
  RELEASE_DATE?: string; // Format: "2018/1/1"
  LAST_PLAYED?: string; // Format: "2026/1/15"
  PLAYCOUNT?: string; // Number of plays
  FLAGS?: string; // Internal flags
  FILESIZE?: string; // File size in KB
  COLOR?: string; // Track color in Traktor (1-16)
}

export interface TraktorTempo {
  BPM: string; // e.g., "123.000061"
  BPM_QUALITY?: string; // e.g., "100.000000"
}

export interface TraktorLoudness {
  PEAK_DB?: string; // e.g., "-0.973836"
  PERCEIVED_DB?: string; // e.g., "-0.627350"
  ANALYZED_DB?: string; // e.g., "-0.627350"
}

export interface TraktorMusicalKey {
  VALUE: string; // Numeric key value 0-23
}

/**
 * Traktor Cue Point (V2 format)
 *
 * Cue types:
 * - 0 = Cue (hot cue)
 * - 1 = Fade-in
 * - 2 = Fade-out
 * - 3 = Load
 * - 4 = Grid (beatgrid marker)
 * - 5 = Loop
 *
 * TYPE=4 (Grid/AutoGrid) cues contain a nested <GRID BPM="..."> element
 * that stores the precise BPM for beatgrid alignment. This must be preserved.
 */
export interface TraktorCue {
  NAME?: string; // e.g., "AutoGrid", "Intro"
  DISPL_ORDER?: string; // Display order
  TYPE: string; // 0-5, see above
  START: string; // Position in milliseconds
  LEN?: string; // Length in milliseconds (for loops)
  REPEATS?: string; // Loop repeats, -1 for infinite
  HOTCUE?: string; // Hotcue slot number 0-7
  GRID?: { BPM: string }; // Nested GRID element for TYPE=4 (AutoGrid) with precise BPM
}

export interface TraktorPrimaryKey {
  TYPE?: string;
  KEY?: string; // Usually the file path
}

// ============================================================================
// Playlists Structure
// ============================================================================

export interface TraktorPlaylists {
  NODE: TraktorNode;
}

/**
 * Recursive node structure for playlists and folders
 *
 * Traktor uses a tree structure where:
 * - TYPE="FOLDER" nodes contain other nodes
 * - TYPE="PLAYLIST" nodes contain track entries
 */
export interface TraktorNode {
  TYPE: 'FOLDER' | 'PLAYLIST';
  NAME: string;
  SUBNODES?: TraktorSubnodes;
  PLAYLIST?: TraktorPlaylistData;
}

export interface TraktorSubnodes {
  COUNT?: string;
  NODE?: TraktorNode | TraktorNode[]; // Can be single or array
}

export interface TraktorPlaylistData {
  ENTRIES: string; // Number of entries
  TYPE: string; // Playlist type
  UUID: string; // Unique identifier for sync
  ENTRY?: TraktorPlaylistEntry | TraktorPlaylistEntry[];
}

export interface TraktorPlaylistEntry {
  PRIMARYKEY: TraktorPrimaryKey;
}

// ============================================================================
// Sorting Order
// ============================================================================

export interface TraktorSortingOrder {
  PATH?: string;
  DIRECTION?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Traktor cue type numeric values
 */
export enum TraktorCueType {
  CUE = 0,
  FADE_IN = 1,
  FADE_OUT = 2,
  LOAD = 3,
  GRID = 4,
  LOOP = 5,
}

/**
 * Traktor rating scale: 0-255 maps to 0-5 stars
 * Common values seen in collection.nml:
 * - 51 = 1 star
 * - 102 = 2 stars
 * - 153 = 3 stars
 * - 204 = 4 stars
 * - 255 = 5 stars
 */
export const TRAKTOR_RATING_SCALE = {
  MIN: 0,
  MAX: 255,
  STEP: 51, // 255 / 5 = 51
};

/**
 * Traktor key notation mapping
 *
 * Traktor uses Open Key notation:
 * - "1m" through "12m" for minor keys
 * - "1d" through "12d" for major keys (d = dur = major in German)
 */
export const TRAKTOR_KEY_MAP: Record<string, string> = {
  // Minor keys (m)
  '1m': 'Am',
  '2m': 'Em',
  '3m': 'Bm',
  '4m': 'F#m',
  '5m': 'Dbm',
  '6m': 'Abm',
  '7m': 'Ebm',
  '8m': 'Bbm',
  '9m': 'Fm',
  '10m': 'Cm',
  '11m': 'Gm',
  '12m': 'Dm',
  // Major keys (d = dur)
  '1d': 'C',
  '2d': 'G',
  '3d': 'D',
  '4d': 'A',
  '5d': 'E',
  '6d': 'B',
  '7d': 'Gb',
  '8d': 'Db',
  '9d': 'Ab',
  '10d': 'Eb',
  '11d': 'Bb',
  '12d': 'F',
};

/**
 * Reverse mapping from standard key notation to Traktor
 */
export const HARMONY_TO_TRAKTOR_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(TRAKTOR_KEY_MAP).map(([traktor, harmony]) => [harmony, traktor]),
);

/**
 * MUSICAL_KEY VALUE to standard key mapping
 * Values 0-11 are major keys, 12-23 are minor keys
 */
export const TRAKTOR_MUSICAL_KEY_VALUES: Record<string, string> = {
  '0': 'C',
  '1': 'Db',
  '2': 'D',
  '3': 'Eb',
  '4': 'E',
  '5': 'F',
  '6': 'Gb',
  '7': 'G',
  '8': 'Ab',
  '9': 'A',
  '10': 'Bb',
  '11': 'B',
  '12': 'Cm',
  '13': 'Dbm',
  '14': 'Dm',
  '15': 'Ebm',
  '16': 'Em',
  '17': 'Fm',
  '18': 'Gbm',
  '19': 'Gm',
  '20': 'Abm',
  '21': 'Am',
  '22': 'Bbm',
  '23': 'Bm',
};
