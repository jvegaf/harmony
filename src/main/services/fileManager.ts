import recursiveReadDir from 'recursive-readdir';
import path from 'path';
import fs from 'fs';
import { Track } from '../../shared/types/emusik';

export const GetFilesFrom = async (filePath: string) => {
  return recursiveReadDir(filePath).then(result => {
    return result.filter(file => path.extname(file).toLowerCase() === '.mp3');
  });
};

export const ExtractToFile = (jsonObj: unknown, filename: string) => {
  const jsonContent = JSON.stringify(jsonObj, null, 2);
  const today = new Date();

  const fname = `./${today.getSeconds()}${today.getMinutes()}${filename}.json`;

  // eslint-disable-next-line consistent-return
  fs.writeFile(fname, jsonContent, 'utf8', err => {
    if (err) {
      log.error('An error occured while writing JSON Object to File.');
      return log.error(err);
    }
  });
};

export const SaveTags = (track: Track) => {
  log.info('Saving tags...', track.title);
};
