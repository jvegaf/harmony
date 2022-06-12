/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint global-require: off, no-console: off, promise/always-return: off */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { GetFilesFrom } from './services/fileManager';
import PersistTrack from './services/tag/nodeId3Saver';
import FixTags, { FixTracks } from './services/tagger/Tagger';
import { GetTracks } from './services/track/trackManager';
import { resolveHtmlPath } from './util';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

process.on('warning', e => console.warn(e.stack));

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map(name => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1300,
    height: 900,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      webSecurity: false,
      contextIsolation: true,
      preload: app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.maximize();
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(edata => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

ipcMain.on('ipc-example', async (event, arg) => {
  // const response = await SearchYtTags('Stop The Beat', 'Angel Heredia');
  // console.log(response);
  // getDevTracks('/home/samsepi0l/Documents/colocadas');
  // getDevTracks('C:\\Users\\josev\\Desktop\\nuevas-mayo-junio\\nuevas_junio');
  // getDevTracks('C:\\Users\\jevf\\My Private Documents\\nuevas-mayo-junio');
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.sender.send('ipc-example', msgTemplate('pong'));
});

ipcMain.on('show-context-menu', (event, trackId) => {
  console.log(`track id: ${trackId}`);
  const template = [
    {
      label: 'Details',
      click: () => {
        event.sender.send('view-detail-command', trackId);
      },
    },
    {
      label: 'Play Track',
      click: () => {
        event.sender.send('play-command', trackId);
      },
    },
    { type: 'separator' },
    {
      label: 'Fix Tags',
      click: () => {
        event.sender.send('fix-track-command', trackId);
      },
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on('persist', (_, track) => PersistTrack(track));

ipcMain.handle('open-folder', async event => {
  const resultPath = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openDirectory'],
  });

  if (resultPath.canceled) return null;

  const files = await GetFilesFrom(resultPath.filePaths[0]);
  const tracks = await GetTracks(files);
  return tracks;
});

ipcMain.handle('fix-track', async (e, track) => {
  const updated = await FixTags(track);
  return updated;
});

ipcMain.handle('fix-tracks', async (e, tracks) => {
  console.log(`fixing ${tracks.length} tracks`);
  const fixed = await FixTracks(tracks);
  return fixed;
});
