/**
 * App models
 */

export interface Artwork {
  mime: string;
  type: { id: number; name: string };
  description: string;
  imageBuffer: Buffer;
}

export interface Track {
  id: string;
  album: string | undefined;
  artist: string | undefined;
  bpm: string | undefined;
  genre: string | undefined;
  key: string | undefined;
  duration: number;
  time: string;
  filepath: string;
  title: string;
  year: number | undefined;
  artwork: Artwork | undefined;
}

export interface ResultTag {
  id: string;
  album: string | undefined;
  artist: string | undefined;
  bpm: number | undefined;
  genre: string | undefined;
  key: string | undefined;
  duration: number;
  title: string;
  year: string | undefined;
  artworkUrl: string | undefined;
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
