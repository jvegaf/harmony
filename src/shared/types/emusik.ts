/**
 * App models
 */
export interface Track {
  id: string;
  album: string | null;
  artist: string | null;
  bpm: number | null;
  genre: string | null;
  key: string | null;
  path: string;
  title: string;
  year: number | null;
}

export interface Playlist {
  name: string;
  tracks: string[];
}
