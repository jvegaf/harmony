import { ResultTag } from '@preload/emusik';
import { BandcampSearchResult } from './bandcamp';

export const getResultTag = (result: BandcampSearchResult): ResultTag => {
  return {
    album: result.album,
    artist: result.artist,
    genre: result.genre,
    duration: result.duration,
    title: result.name,
    year: result.releaseDate?.slice(-4),
    artworkUrl: result.imageUrl,
  };
};
