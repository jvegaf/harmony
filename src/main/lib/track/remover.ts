import log from 'electron-log';

function RemoveFile(path: string) {
  return new Promise<void>((resolve, reject) => {
    const fs = require('fs');
    fs.unlink(path, (err: Error) => {
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
