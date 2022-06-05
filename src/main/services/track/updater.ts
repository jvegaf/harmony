import { ResultTag, Track } from '../../../shared/types/emusik';
import { ParseDuration } from '../../../shared/utils';

const Update = (track: Track, tag: ResultTag): Track => {
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
  return track;
};

export default Update;
