import log from 'electron-log/main';
export const removeFile = (path: string) => {
  return new Promise<void>((resolve, reject) => {
    const fs = require('fs');
    fs.unlink(path, err => {
      if (err) {
        log.error(err);
        reject(err);
      } else {
        resolve();
        log.info('file removed');
      }
    });
  });
};
