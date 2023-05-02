import path from 'path';
import { FILE_DONE } from 'src/shared/types/channels';
import { v4 as uuid } from 'uuid';
import type { Track } from '../../../shared/types/emusik';
import { ParseDuration, Sanitize } from '../../../shared/utils';
import { log } from '../log/log';
import LoadTagsFromFile from '../tag/mmLoader';
import LoadArtworkFromFile from '../tag/nId3ArtLoader';

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

export const CreateTrack = async (file: string): Promise<Track | null> => {
  const tags = await LoadTagsFromFile(file);
  if (tags == null) {
    log.warn(`can not create track of ${file}`);
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
    time: tags.duration ? ParseDuration(tags.duration) : undefined,
    filepath: file,
    title: GetTrackTitle(tags.title, file),
    year: tags.year,
    artwork: await LoadArtworkFromFile(file),
    bitrate: tags.bitrate ? tags.bitrate / 1000 : undefined,
  };
  return track;
};

const CreateTracks = async (event: Electron.IpcMainEvent, files: string[]) => {
  const tracks: Track[] = [];

  await Promise.all(
    files.map(async (file) => {
      const track = await CreateTrack(file);
      if (track !== null) {
        tracks.push(track);
        event.sender.send(FILE_DONE);
      }
    })
  );

  return tracks;
};

export default CreateTracks;