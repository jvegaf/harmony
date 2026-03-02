export type BandcampAlbumInfo = {
  artist: string;
  title: string;
  imageUrl: string;
  url: string;
  tracks: Array<BandcampTrack>;
};

export type BandcampArtistInfo = {
  name: string;
  location: string;
  coverImage: string;
  description: string;
  albums: {
    url: string;
    coverImage?: string;
    title: string;
  }[];
  shows: {
    date: string;
    venue: string;
    venueUrl: string;
    location: string;
  }[];
  bandLinks: {
    name: string;
    url: string;
  }[];
};

export type BandcampTrack = {
  name: string;
  url: string;
  duration: string;
};

export type BandcampSearchResult = {
  type: 'artist' | 'album' | 'track';
  name: string;
  url: string;
  imageUrl: string;
  tags: string[];

  genre?: string;
  location?: string;
  releaseDate?: string;
  artist?: string;
  album?: string;
  track?: string;
  duration?: number;
  tracks?: BandcampTrack[];
};
