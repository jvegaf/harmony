/**
 * App models
 */

export interface Artwork {
  mime: string;
  type: { id: number; name: string };
  description: string;
  data: Buffer;
}

export interface Track {
  id: string;
  album?: string;
  artist?: string;
  bpm?: string;
  genre?: string;
  key?: string;
  duration: number;
  time: string;
  filepath: string;
  title: string;
  year?: number;
  bitrate?: number;
  artwork?: Artwork;
  artUrl?: string;
}

export interface ResultTag {
  id: string;
  album?: string;
  artist?: string;
  bpm?: number;
  genre?: string;
  key?: string;
  duration: number;
  title: string;
  year?: string;
  artworkUrl?: string;
  tokens: string[];
}

export interface Playlist {
  name: string;
  tracks: string[];
}

export enum MenuCommand {
  PLAY_TRACK,
  FIX_TAGS,
  VIEW_DETAIL,
}

export interface MatchResult {
  tag: ResultTag;
  trackTokens: string[];
  matches: number;
  of: number;
}
