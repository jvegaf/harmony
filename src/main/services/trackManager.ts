/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import * as Path from 'path';
import { v4 as uuid } from 'uuid';
import * as NodeId3 from 'node-id3';
import { readFileSync } from 'fs';
import { Sanitize } from '../../shared/utils';
import { Track } from '../../shared/types/emusik';

const getFilename = (filepath) => {
  return Path.basename(filepath, '.mp3');
};

const sanitizeFilename = (filename) => {
  return Sanitize(filename).split('_').join(' ').trim();
};

const trackTitle = (title, filepath) => {
  if (title && title.length) {
    return title;
  }
  const filename = getFilename(filepath);
  return sanitizeFilename(filename);
};

const CreateTrack = async (file): Track => {
  const filebuffer = readFileSync(file);
  const tags: Tags = NodeId3.read(filebuffer);

  const track: Track = {
    id: uuid(),
    album: tags.album,
    artist: tags.artist,
    bpm: tags.bpm,
    genre: tags.genre,
    key: tags.initialKey,
    path: file,
    title: trackTitle(tags.title, file),
    year: tags.year,
  };
  return track;
};

export const GetTracks = async (files) => {
  const tracks = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const track = await CreateTrack(file);
    tracks.push(track);
  }

  return tracks;
};
