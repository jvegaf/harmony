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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ExtractToFile = (jsonObj: any, filePath: string) => {
  const jsonContent = JSON.stringify(jsonObj);
  Fs.writeFile(filePath, jsonContent, 'utf8', (err) => {
    if (err) {
      console.log('An error occured while writing JSON Object to File.');
      return console.log(err);
    }

    return console.log('JSON file has been saved.');
  });
};
