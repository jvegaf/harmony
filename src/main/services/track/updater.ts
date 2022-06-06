import { ResultTag, Track } from '../../../shared/types/emusik';
import { ParseDuration } from '../../../shared/utils';
import PersistTrack from '../tag/nodeId3Saver';

const Update = async (track: Track, tag: ResultTag): Promise<Track> => {
  if (!tag) return track;

  track.title = tag.title;
  track.artist = tag.artist;
  track.album = tag.album;
  track.duration = tag.duration;
  track.time = ParseDuration(tag.duration);
  track.year = tag.year;
  track.bpm = tag.bpm;
  track.key = tag.key;
  track.genre = tag.genre;
  track.artworkUrl = tag.artworkUrl;

  try {
    await PersistTrack(track);
  } catch (error) {
    log.error(error);
  }

  return track;
};

export default Update;
