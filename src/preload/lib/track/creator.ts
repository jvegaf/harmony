import path from 'path';
import { randomUUID } from 'node:crypto';
import LoadTagsFromFile from '../tag/mm-loader';
import type { Track } from '../../types';
import log from 'electron-log/main';
import { ParseDuration, Sanitize } from '../../utils';

const getFilename = (filepath: string) => {
  return path.basename(filepath, '.mp3');
};

const sanitizeFilename = (filename: string) => {
  return Sanitize(filename).replace('-', ' ').split('_').join(' ').trim();
};

const GetTrackTitle = (title: string | undefined, filepath: string) => {
  if (title && title.length) {
    return title;
  }
  const filename = getFilename(filepath);
  return sanitizeFilename(filename);
};

const CreateTrack = async (file: string): Promise<Track | null> => {
  const tags = await LoadTagsFromFile(file);
  if (!tags) {
    log.warn(`can not create track of ${file}`);
    return null;
  }

  const trackId = randomUUID();
  const track: Track = {
    id: trackId,
    album: tags.album,
    artist: tags.artist,
    bpm: tags.bpm,
    genre: tags.genre?.join(', '),
    key: tags.key,
    duration: tags.duration,
    time: tags.duration ? ParseDuration(tags.duration) : undefined,
    path: file,
    title: GetTrackTitle(tags.title, file),
    year: tags.year,
    bitrate: tags.bitrate ? tags.bitrate / 1000 : undefined,
  };
  return track;
};

export default CreateTrack;
