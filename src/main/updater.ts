import { autoUpdater } from 'electron-updater';

/**
 * ELECTRON AUTO UPDATER LISTENERS
 */


autoUpdater.on('checking-for-update', () => {
});

autoUpdater.on('update-available', (info) => {
});

autoUpdater.on('update-not-available', (info) => {
});

autoUpdater.on('error', (err) => {
});

autoUpdater.on('download-progress', (speed) => {
  let logMessage = `Downloading speed: ${speed.bytesPerSecond}`;
  logMessage = `${logMessage} - Downloaded ${speed.percent}%`;
  logMessage = `${logMessage} (${speed.transferred}/${speed.total})`;
});

autoUpdater.on('update-downloaded', (info) => {
  autoUpdater.quitAndInstall();
});