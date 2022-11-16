import * as NodeId3 from 'node-id3';
import { Track } from '../../types/emusik';

const PersistTrack = (track: Track) => {
  const { title, artist, album, year, genre, artwork, bpm, key } = track;

  const beats = bpm ? bpm.toString() : undefined;
  const yearStr = year ? year.toString() : undefined;
  const art = artwork ? { ...artwork, imageBuffer: artwork.data } : undefined;
  const tags = {
    title,
    artist,
    album,
    year: yearStr,
    genre,
    artwork: art,
    bpm: beats,
    key
  };

  NodeId3.update(tags, track.filepath, (_: unknown, err: Error) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.log(`Error persisting track: ${err}`);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`track persisted: ${track.title}`);
};

export default PersistTrack;
