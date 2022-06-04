/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import recursiveReadDir from 'recursive-readdir';
import * as Path from 'path';
import * as Fs from 'fs';
import { Track } from '../../shared/types/emusik';

export const GetFilesFrom = async (filePath: string) => {
  return recursiveReadDir(filePath).then((result) => {
    return result.filter((file) => Path.extname(file).toLowerCase() === '.mp3');
  });
};

export const ExtractToFile = (jsonObj: any, filename: string) => {
  const jsonContent = JSON.stringify(jsonObj, null, 2);
  const today = new Date();

  const fname = `./${today.getSeconds()}${today.getMinutes()}${filename}.json`;

  // eslint-disable-next-line consistent-return
  Fs.writeFile(fname, jsonContent, 'utf8', (err) => {
    if (err) {
      console.error('An error occured while writing JSON Object to File.');
      return console.error(err);
    }
  });
};

export const SaveTags = (track: Track) => {
  console.log('Saving tags...', track.title);
};
