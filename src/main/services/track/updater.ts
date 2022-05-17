import { ResultTag } from '../../../shared/types/emusik';
import { ParseDuration } from '../../../shared/utils';
import GetArtwork from './artFetcher';

const Update = async (track: Track, tag: ResultTag): Track => {
  const art = await GetArtwork(tag.artworkUrl);

  return {
    ...track,
    title: tag.title,
    album: tag.album,
    artist: tag.artists,
    bpm: tag.bpm?.toString(),
    genre: tag.genre,
    key: tag.key,
    duration: tag.duration,
    time: ParseDuration(tag.duration),
    year: tag.year,
    artwork: art,
  };
};

export default Update;
