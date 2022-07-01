/**
 * App models
 */

export type TrackId = string | null;

export interface Artwork {
  mime?: string;
  type: { id: number; name: string };
  description?: string;
  data: Buffer;
}

export interface Track {
  id: TrackId;
  album?: string;
  artist?: string;
  bpm?: number;
  genre?: string;
  key?: string;
  duration?: number;
  time?: string;
  filepath: string;
  title: string;
  year?: number;
  bitrate?: number;
  artwork?: Artwork;
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
