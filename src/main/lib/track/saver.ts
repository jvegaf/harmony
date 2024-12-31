import * as NodeId3 from 'node-id3';
import { mainLogger } from '../log/logger';
import { Track } from '../../../preload/types/emusik';

const PersistTrack = (track: Track) => {
  const { title, artist, album, year, genre, bpm, initialKey } = track;

  const beats = bpm ? bpm.toString() : undefined;
  const yearStr = year ? year.toString() : undefined;
  const tags = {
    title,
    artist,
    album,
    year: yearStr,
    genre,
    bpm: beats,
    initialKey,
  } as NodeId3.Tags;

  NodeId3.Promise.update(tags, track.path)
    .then()
    .catch(reason => mainLogger.error('track persist error', reason));
};

export default PersistTrack;
