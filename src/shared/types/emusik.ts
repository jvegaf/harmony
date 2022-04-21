/**
 * App models
 */
export interface Track {
  album: string;
  artist: string;
  bpm: number;
  duration: number;
  genre: string;
  key: string;
  loweredMetas: {
    artist: string;
    album: string;
    title: string;
    genre: string;
  };
  path: string;
  title: string;
  year: number | null;
}

export interface Playlist {
  name: string;
  tracks: string[];
}
