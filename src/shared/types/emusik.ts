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
  year: string | undefined;
  artwork: Artwork | undefined;
}

export interface TagResult {
  id: string;
  album: string | undefined;
  artists: string | undefined;
  bpm: number | undefined;
  genre: string | undefined;
  key: string | undefined;
  duration: number;
  title: string;
  year: string | undefined;
  artworkUrl: string | undefined;
}

export interface Playlist {
  name: string;
  tracks: string[];
}

export enum MenuCommand {
  PLAY_TRACK,
  FIX_TAGS,
}
