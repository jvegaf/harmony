import * as NodeId3 from 'node-id3';
import type { Track } from '../../../shared/types/emusik';

const PersistTrack = (track: Track) => {
  const {
    title, artist, album, year, genre, artwork, bpm, key 
  } = track;

  const beats   = bpm ? bpm.toString() : undefined;
  const yearStr = year ? year.toString() : undefined;
  const tags    = {
    title,
    artist,
    album,
    year:  yearStr,
    genre,
    image: artwork,
    bpm:   beats,
    key,
  } as NodeId3.Tags;

  NodeId3.update(tags, track.filepath, (_: unknown, err: Error) => {
    if(err){
      log.error(`Error persisting track: ${err}`);
    }
  });

  log.info(`track persisted: ${track.title}`);
};

export default PersistTrack;
