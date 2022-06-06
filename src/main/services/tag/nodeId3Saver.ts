import * as NodeId3 from 'node-id3';

const PersistTrack = (track: Track) => {
  const { title, artist, album, year, genre, artwork, bpm, key } = track;

  const tags = {
    title,
    artist,
    album,
    year,
    genre,
    artwork,
    bpm,
    key,
  };

  NodeId3.update(tags, track.filepath, (_, err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.err(`Error persisting track: ${err}`);
    }
  });
};

export default PersistTrack;
