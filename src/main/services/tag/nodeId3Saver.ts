import * as NodeId3 from 'node-id3';
import { Track } from 'shared/types/emusik';

const PersistTrack = (track: Track) => {
  const { title, artist, album, year, genre, artwork, bpm, key } = track;

  const beats = bpm ? bpm.toString() : undefined;
  const yearStr = year ? year.toString() : undefined;

  const tags = {
    title,
    artist,
    album,
    year: yearStr,
    genre,
    artwork,
    bpm: beats,
    key,
  };

  NodeId3.update(tags, track.filepath, (_, err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error(`Error persisting track: ${err}`);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`track persisted: ${track.title}`);
};

export default PersistTrack;
