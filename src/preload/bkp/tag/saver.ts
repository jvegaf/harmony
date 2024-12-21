import * as NodeId3 from 'node-id3';
import log from 'electron-log/main';
import { Artwork, Track } from '@preload/emusik';

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

  NodeId3.Promise.update(tags, track.path)
    .then()
    .catch(reason => log.error('track persist error', reason));
};

export default PersistTrack;
