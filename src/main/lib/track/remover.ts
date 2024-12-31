import { mainLogger } from '../log/logger';

export const removeFile = (path: string) => {
  return new Promise<void>((resolve, reject) => {
    const fs = require('fs');
    fs.unlink(path, err => {
      if (err) {
        mainLogger.warn(err);
        reject(err);
      } else {
        resolve();
        mainLogger.info('file removed');
      }
    });
  });
};
