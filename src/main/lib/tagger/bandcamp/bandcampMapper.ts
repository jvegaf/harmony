import { GetStringTokens } from '../../../../preload/lib/utils-id3';
import { ResultTag } from '../../../../preload/types/harmony';
import { BandcampSearchResult } from './bandcamp';

export const getResultTag = (result: BandcampSearchResult): ResultTag => {
  const tagTokens = GetStringTokens([result.name, result.artist || '', result.album || '']);

  return {
    album: result.album,
    artist: result.artist,
    genre: result.genre,
    duration: result.duration || 0,
    title: result.name,
    year: result.releaseDate?.slice(-4),
    tokens: tagTokens,
    artworkUrl: result.imageUrl,
  };
};
