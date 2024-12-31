import log from 'electron-log';

export const removeFile = (path: string) => {
  return new Promise<void>((resolve, reject) => {
    const fs = require('fs');
    fs.unlink(path, err => {
      if (err) {
        log.warn(err);
        reject(err);
      } else {
        resolve();
        log.info('file removed');
      }
    });
  });
};
