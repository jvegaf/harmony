/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
import * as Path from 'path';
import { v4 as uuid } from 'uuid';
import * as NodeId3 from 'node-id3';
import { readFileSync } from 'fs';
import musicDuration from 'music-duration';
import { Sanitize, ParseDuration } from '../../../shared/utils';
import { Artwork, Track } from '../../../shared/types/emusik';

const getFilename = (filepath: string) => {
  return Path.basename(filepath, '.mp3');
};

const getDuration = async (buffer: Buffer) => {
  return musicDuration(buffer);
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

const getArtwork = (tags: NodeId3.Tags): Artwork | undefined => {
  if (tags.image === undefined) {
    return undefined;
  }
  return tags.image as Artwork;
};

const CreateTrack = async (file: string): Promise<Track> => {
  const filebuffer = readFileSync(file);
  const tags: NodeId3.Tags = NodeId3.read(filebuffer);

  const trackDuration = await getDuration(filebuffer);
  const trackTime = ParseDuration(trackDuration);

  const track: Track = {
    id: uuid(),
    album: tags.album,
    artist: tags.artist,
    bpm: tags.bpm,
    genre: tags.genre,
    key: tags.initialKey,
    duration: trackDuration,
    time: trackTime,
    filepath: file,
    title: trackTitle(tags.title, file),
    year: tags.year,
    artwork: getArtwork(tags),
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
