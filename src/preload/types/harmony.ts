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
  genre?: string;
  initialKey?: string;
  duration: number;
  time?: string;
  path: TrackSrc;
  title: string;
  year?: number;
  bitrate?: number;
  rating?: TrackRating;
  comment?: string;
  /** Waveform peaks for visualization (~300 values, normalized 0-1) */
  waveformPeaks?: number[];
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
  tokens?: Maybe<string[]>;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  trackId: string;
  order: number;
  // AIDEV-NOTE: Optional relations for TypeORM eager loading
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
  'title' | 'artist' | 'album' | 'genre' | 'year' | 'comment' | 'bpm' | 'initialKey'
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
}

export const enum SearchEngine {
  BEATPORT,
  TRAXSOURCE,
  GOOGLE,
}
