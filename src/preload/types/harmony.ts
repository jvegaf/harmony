export type Maybe<T> = T | null | undefined;

export enum PlayerStatus {
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
}

/**
 * App models
 */

export type TrackId = string;
export type TrackSrc = string;

export interface Artwork {
  mime: string;
  type: { id: number };
  description?: string;
  imageBuffer: Buffer;
}

export interface TrackRating {
  source?: string;
  rating: number;
}

export interface Track {
  id: TrackId;
  album?: string;
  artist?: string;
  bpm?: number;
  /**
   * Precise BPM as string for round-trip preservation.
   * AIDEV-NOTE: Traktor stores BPM with high precision (e.g., "123.000061").
   * This field preserves the original value for re-export.
   */
  bpmPrecise?: string;
  genre?: string;
  initialKey?: string;
  duration: number;
  time?: string;
  path: TrackSrc;
  title: string;
  year?: number;
  /**
   * Full release date string for round-trip preservation.
   * AIDEV-NOTE: Traktor uses "YYYY/M/D" format. This preserves month/day
   * that would otherwise be lost when only storing `year`.
   */
  releaseDate?: string;
  /** Bitrate in kilobits per second (kbps). AIDEV-NOTE: Traktor stores bps, converted on import. */
  bitrate?: number;
  rating?: TrackRating;
  comment?: string;
  label?: string;
  /** Waveform peaks for visualization (~300 values, normalized 0-1) */
  waveformPeaks?: number[];
  /** Timestamp when the track was added to Harmony. AIDEV-NOTE: Used for "Recently Added" view */
  addedAt?: number;
}

export interface ResultTag {
  id?: string | number;
  album?: Maybe<string>;
  artist?: Maybe<string>;
  artists: string[];
  bpm?: Maybe<number>;
  genre?: string;
  duration?: Maybe<number>; // seconds
  key?: Maybe<string>;
  title: string;
  year?: string;
  art?: Maybe<string>;
  label?: Maybe<string>;
  tokens?: Maybe<string[]>;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  order: number;
  // AIDEV-NOTE: Optional relations for Drizzle relational queries
  playlist?: Playlist;
  track?: Track;
}

export interface Playlist {
  id: string;
  name: string;
  tracks?: Track[];
  playlistTracks?: PlaylistTrack[];
  /** AIDEV-NOTE: Optional folder ID for Traktor playlist hierarchy support */
  folderId?: string;
  folder?: Folder;
}

/**
 * Folder for organizing playlists in a hierarchical structure.
 * Supports nested folders via parentId for Traktor-style folder trees.
 *
 * AIDEV-NOTE: Used for Traktor bidirectional sync to preserve
 * the complete playlist folder hierarchy from collection.nml
 */
export interface Folder {
  id: string;
  name: string;
  /** Parent folder ID for nesting. Null = root level folder */
  parentId?: string | null;
  /** Full path in the folder tree (e.g., "DJ Sets/House/Deep House") */
  path?: string;
  parent?: Folder;
  children?: Folder[];
  playlists?: Playlist[];
}

export interface MatchResult {
  tag: ResultTag;
  trackTokens: string[];
  matches: number;
  of: number;
}

export interface ArtTrack {
  reqTrack: Track;
  selectedArtUrl?: string;
}

export interface ArtsTrackDTO extends ArtTrack {
  artsUrls: string[];
}

export const enum LogLevel {
  INFO,
  WARN,
  DEBUG,
  ERROR,
  VERBOSE,
}

export type TrackEditableFields = Pick<
  Track,
  'title' | 'artist' | 'album' | 'genre' | 'year' | 'comment' | 'bpm' | 'initialKey' | 'label'
>;

export type LogProps = {
  level: LogLevel;
  params: any[];
};

export type TrklistCtxMenuPayload = {
  selected: Track[];
  playlists: Playlist[];
  currentPlaylist: string | null;
};

export type CommandPayload = {
  playlistId: string;
  selected: Track[];
};

export type UpdateRatingPayload = {
  trackSrc: TrackSrc;
  rating: number;
};

/**
 * Configuration for a custom search engine in the context menu.
 * AIDEV-NOTE: Users can add custom search engines via Settings > General.
 * The urlTemplate must contain {query} placeholder which gets replaced with the search term.
 */
export interface SearchEngineConfig {
  /** Unique identifier for the search engine */
  id: string;
  /** Display name shown in the context menu */
  name: string;
  /** URL template with {query} placeholder, e.g. 'https://google.com/search?q={query}' */
  urlTemplate: string;
  /** If true, this engine cannot be deleted (Beatport, TraxxSource, Google) */
  isDefault: boolean;
}

export interface Config {
  audioVolume: number;
  audioOutputDevice: string;
  audioMuted: boolean;
  sleepBlocker: boolean;
  displayNotifications: boolean;
  audioPreCuePosition: number;
  /** Number of parallel workers for audio analysis (1-16). Default: CPU cores - 1 */
  audioAnalysisWorkers: number;
  tracklistSort: {
    colId: string;
    mode: string;
  };
  /** Custom search engines for track context menu */
  searchEngines: SearchEngineConfig[];
  /** UI appearance theme: 'light', 'dark', or 'auto' (follows system preference) */
  theme: 'light' | 'dark' | 'auto';
  /** Root path of the music collection for re-scanning and change detection */
  libraryPath: string;
  /** Auto-fix metadata for newly imported tracks with missing tags */
  autoFixMetadata: boolean;
  /** Traktor NML integration configuration */
  traktorConfig: {
    nmlPath: string;
    syncStrategy: 'traktor_wins' | 'harmony_wins' | 'smart_merge';
    cueStrategy: 'SMART_MERGE' | 'REPLACE';
    syncOnStartup: boolean;
    autoBackup: boolean;
    /** Auto-sync configuration for background synchronization */
    autoSync: {
      enabled: boolean;
      direction: 'import' | 'export' | 'bidirectional';
      onStartup: boolean;
      onLibraryChange: boolean;
      debounceMs: number;
    };
  };
  /**
   * Duplicate finder configuration.
   * AIDEV-NOTE: Configures which detection criteria are enabled and their parameters.
   * Users can toggle individual criteria in Settings > Duplicates panel.
   */
  duplicateFinderConfig: {
    /** Individual detection criteria - each can be toggled independently */
    criteria: {
      /** Compare normalized title using fuzzy matching */
      title: boolean;
      /** Compare normalized artist using fuzzy matching */
      artist: boolean;
      /** Compare duration within tolerance */
      duration: boolean;
    };
    /** Tolerance in seconds for duration comparison (default: 2) */
    durationToleranceSeconds: number;
    /** Similarity threshold for fuzzy matching 0-1 (default: 0.85) */
    similarityThreshold: number;
  };
}

/**
 * Result of checking library changes between filesystem and database.
 * Used to detect new files added by user and missing files deleted by user.
 */
export interface LibraryChanges {
  /** New audio files found in the filesystem that are not in the database */
  added: string[];
  /** Tracks in the database whose files no longer exist in the filesystem */
  removed: { id: TrackId; path: string; title: string; artist?: string }[];
}

export const enum SearchEngine {
  BEATPORT,
  TRAXSOURCE,
  GOOGLE,
}
