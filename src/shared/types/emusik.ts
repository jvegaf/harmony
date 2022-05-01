/**
 * App models
 */
export interface Track {
  id: string;
  album: string | undefined;
  artist: string | undefined;
  bpm: string | undefined;
  genre: string | undefined;
  key: string | undefined;
  duration: number;
  time: string;
  path: string;
  title: string;
  year: string | undefined;
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
}

export interface Playlist {
  name: string;
  tracks: string[];
}
