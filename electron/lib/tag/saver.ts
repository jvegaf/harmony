import * as NodeId3 from 'node-id3';
import { Artwork, Track } from '../../types';
import log from 'electron-log/main';

const PersistTrack = (track: Track, artwork?: Artwork) => {
  const { title, artist, album, year, genre, bpm, key } = track;

  const beats = bpm ? bpm.toString() : undefined;
  const yearStr = year ? year.toString() : undefined;
  const tags = {
    title,
    artist,
    album,
    year: yearStr,
    genre,
    image: artwork,
    bpm: beats,
    key,
  } as NodeId3.Tags;

  NodeId3.update(tags, track.path as string, (_: unknown, err: Error) => {
    if (err) {
      log.error(`Error persisting track: ${err}`);
    }
  });

  log.info(`track persisted: ${track.title}`);
};

export default PersistTrack;
