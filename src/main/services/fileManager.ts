/* eslint-disable import/prefer-default-export */
import recursiveReadDir from 'recursive-readdir';
import * as Path from 'path';

export const GetFilesFrom = async (filePath: string) => {
  return recursiveReadDir(filePath).then((result) => {
    return result.filter((file) => Path.extname(file).toLowerCase() === '.mp3');
  });
};
