/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import * as Path from 'path';
import { v4 as uuid } from 'uuid';
import { Sanitize, ParseDuration } from '../../../shared/utils';
import { Track } from '../../../shared/types/emusik';
import LoadTagsFromFile from '../tag/loader';

const getFilename = (filepath: string) => {
  return Path.basename(filepath, '.mp3');
};

const sanitizeFilename = (filename: string) => {
  return Sanitize(filename).replaceAll('-', ' ').split('_').join(' ').trim();
};

const trackTitle = (title: string | undefined, filepath: string) => {
  if (title && title.length) {
    return title;
  }
  const filename = getFilename(filepath);
  return sanitizeFilename(filename);
};

const CreateTrack = async (file: string): Promise<?Track> => {
  const tags = await LoadTagsFromFile(file);
  if (!tags) {
    return null;
  }

  const track: Track = {
    id: uuid(),
    album: tags.album,
    artist: tags.artist,
    bpm: tags.bpm,
    genre: tags.genre?.join(', '),
    key: tags.key,
    duration: tags.duration,
    time: ParseDuration(tags.duration),
    filepath: file,
    title: trackTitle(tags.title, file),
    year: tags.year,
  };
  return track;
};

export const GetTracks = async (files: string[]) => {
  const tracks = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const track = await CreateTrack(file);
    tracks.push(track);
  }

  return tracks;
};
