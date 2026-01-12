import log from 'electron-log';

import fs from 'fs';

function RemoveFile(path: string) {
  return new Promise<void>((resolve, reject) => {
    fs.unlink(path, err => {
      if (err) {
        log.error('remove file error: ', err);
        reject(err);
      } else {
        resolve();
        log.info('file removed: ', path);
      }
    });
  });
}

export default RemoveFile;
