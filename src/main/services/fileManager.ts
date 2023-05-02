import fs from 'fs';
import recursiveReadDir from 'recursive-readdir';
import type { Track } from '../../shared/types/emusik';
import { log } from './log/log';

export const GetFilesFrom = async (filePath: string) => {
  const files = await recursiveReadDir(filePath);
  return files.filter((file) => file.endsWith('.mp3'));
};

export const ExtractToFile = (jsonObj: unknown, filename: string) => {
  const jsonContent = JSON.stringify(jsonObj, null, 2);
  const today = new Date();

  const fname = `./${today.getSeconds()}${today.getMinutes()}${filename}.json`;

  // eslint-disable-next-line consistent-return
  fs.writeFile(fname, jsonContent, 'utf8', (err) => {
    if (err) {
      log.error('An error occured while writing JSON Object to File.');
      return log.error(err);
    }
  });
};

export const SaveTags = (track: Track) => {
  log.info('Saving tags...', track.title);
};