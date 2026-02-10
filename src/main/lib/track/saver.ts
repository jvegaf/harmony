import * as NodeId3 from 'node-id3';
import log from 'electron-log';
import { Track } from '../../../preload/types/harmony';

const PersistTrack = async (track: Track): Promise<void> => {
  const { title, artist, album, year, genre, bpm, label, initialKey } = track;

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
    publisher: label,
  } as NodeId3.Tags;

  await NodeId3.Promise.update(tags, track.path);
  log.info('track persisted', track.path);
};

export default PersistTrack;
