import { ResultTag, Track } from '../../../shared/types/emusik';
import { ParseDuration } from '../../../shared/utils';
import PersistTrack from '../tag/nodeId3Saver';
import GetArtwork from './artFetcher';

const Update = async (track: Track, tag: ResultTag): Promise<Track> => {
  if (!tag) return track;

  track.title = tag.title;
  track.artist = tag.artist;
  track.album = tag.album;
  track.duration = tag.duration;
  track.time = ParseDuration(tag.duration);
  track.year = tag.year ? Number(tag.year) : undefined;
  track.bpm = tag.bpm;
  track.key = tag.key;
  track.genre = tag.genre;
  track.artwork = tag.artworkUrl ? await GetArtwork(tag.artworkUrl) : undefined;

  try {
    await PersistTrack(track);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return track;
};

export default Update;
