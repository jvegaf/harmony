import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

/**
 * ELECTRON AUTO UPDATER LISTENERS
 */

autoUpdater.logger = log;
log.transports.file.level = 'info';
log.info('App is starting...');

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available.', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.', info);
});

autoUpdater.on('error', (err) => {
  log.info(`Error in auto-updater. ${err}`);
});

autoUpdater.on('download-progress', (speed) => {
  let logMessage = `Downloading speed: ${speed.bytesPerSecond}`;
  logMessage = `${logMessage} - Downloaded ${speed.percent}%`;
  logMessage = `${logMessage} (${speed.transferred}/${speed.total})`;
  log.info(logMessage);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded', info);
  autoUpdater.quitAndInstall();
});
