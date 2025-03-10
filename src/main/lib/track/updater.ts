import { ResultTag, Track } from '../../../preload/types/harmony';
import log from 'electron-log';
import PersistTrack from './saver';

const Update = async (track: Track, tag: ResultTag): Promise<Track> => {
  if (!tag) return track;

  const newTrack = {
    ...track,
    title: tag.title,
    artist: tag.artist,
    album: tag.album,
    year: (tag.year && Number(tag.year)) || track.year,
    bpm: tag.bpm || track.bpm,
    initialKey: tag.key,
    genre: tag.genre || track.genre,
  };

  try {
    PersistTrack(newTrack);
  } catch (error) {
    log.error('update error: ', error);
  }

  return newTrack;
};

export default Update;
