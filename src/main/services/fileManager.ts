/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import recursiveReadDir from 'recursive-readdir';
import * as Path from 'path';
import * as Fs from 'fs';

export const GetFilesFrom = async (filePath: string) => {
  return recursiveReadDir(filePath).then((result) => {
    return result.filter((file) => Path.extname(file).toLowerCase() === '.mp3');
  });
};


export const ExtractToFile = (jsonObj: any, filename: string) => {
  const jsonContent = JSON.stringify(jsonObj, null, 2);

  const fname = `./${new Date().toISOString()}-${filename}.json`;



  Fs.writeFile(fname, jsonContent, 'utf8', (err) => {
    if (err) {
      console.error('An error occured while writing JSON Object to File.');
      return console.error(err);
    }

    return;
  });
};
