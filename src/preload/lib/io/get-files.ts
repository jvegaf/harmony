import recursiveReadDir from 'recursive-readdir';
import path from 'path';

export async function GetFilesFrom(filePath: string) {
  return recursiveReadDir(filePath).then((result) => {
    return result.filter((file) => path.extname(file).toLowerCase() === '.mp3');
  });
}
