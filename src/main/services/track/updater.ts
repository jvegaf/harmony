import { ResultTag } from '../../../shared/types/emusik';
import { ParseDuration } from '../../../shared/utils';

const Update = (track: Track, tag: ResultTag): Track => {
  return {
    ...track,
    title: tag.title,
    album: tag.album,
    artist: tag.artist,
    bpm: tag.bpm,
    genre: tag.genre,
    key: tag.key,
    duration: tag.duration,
    time: ParseDuration(tag.duration),
    year: tag.year,
  };
};

export default Update;
