import { ResultTag, Track } from '../../types/emusik';
import { ParseDuration } from '../../utils';
import PersistTrack from '../tag/nodeId3Saver';
import GetArtwork from './artFetcher';

const Update = async (track: Track, tag: ResultTag): Promise<Track> => {
  if (!tag) return track;

  const newTrack = {
    ...track,
    title: tag.title,
    artist: tag.artist,
    album: tag.album,
    duration: tag.duration,
    time: ParseDuration(tag.duration),
    year: tag.year ? Number(tag.year) : undefined,
    bpm: tag.bpm,
    key: tag.key,
    genre: tag.genre,
    artwork: tag.artworkUrl ? await GetArtwork(tag.artworkUrl) : undefined
  };

  try {
    await PersistTrack(newTrack);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return newTrack;
};

export default Update;
