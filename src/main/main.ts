/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import {
  app, BrowserWindow, dialog, ipcMain, shell
} from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import { GetFilesFrom } from './services/fileManager';
import PersistTrack from './services/tag/nodeId3Saver';
import FixTags from './services/tagger/Tagger';
import CreateTracks from './services/track/creator';
import { TrackRepository } from './services/track/repository';
import { resolveHtmlPath } from './util';


export default class AppUpdater{
  constructor(){
    log.transports.file.level = 'info';
    autoUpdater.logger        = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

process.on('warning', e => console.warn(e.stack));

let trackRepository: TrackRepository | null = null;
let mainWindow: BrowserWindow | null        = null;
let artsWindow: BrowserWindow | null        = null;

if(process.env.NODE_ENV === 'production'){
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if(isDevelopment){
  require('electron-debug')();
}

const installExtensions = async() => {
  const installer     = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions    = [ 'REACT_DEVELOPER_TOOLS' ];

  return installer
    .default(
      extensions.map(name => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createMainWindow = async() => {
  if(isDevelopment){
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show:           false,
    width:          1300,
    height:         900,
    icon:           getAssetPath('icon.png'),
    webPreferences: {
      webSecurity:      false,
      contextIsolation: true,
      preload:          app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if(!mainWindow){
      throw new Error('"mainWindow" is not defined');
    }
    if(process.env.START_MINIMIZED){
      mainWindow.minimize();
    }else{
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

const createArtsWindow = async() => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  artsWindow = new BrowserWindow({
    show:           false,
    width:          1300,
    height:         900,
    icon:           getAssetPath('icon.png'),
    webPreferences: {
      webSecurity:      false,
      contextIsolation: true,
      preload:          app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  artsWindow.loadURL(resolveHtmlPath('arts-window/index.html'));

  artsWindow.on('ready-to-show', () => {
    if(!artsWindow){
      throw new Error('"artsWindow" is not defined');
    }
    if(process.env.START_MINIMIZED){
      artsWindow.minimize();
    }else{
      artsWindow.maximize();
      artsWindow.show();
    }
  });

  artsWindow.on('closed', () => {
    artsWindow = null;
  });

  // Open urls in the user's browser
  artsWindow.webContents.setWindowOpenHandler(edata => {
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
  if(process.platform !== 'darwin'){
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    trackRepository = new TrackRepository();
    createMainWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if(mainWindow === null) createMainWindow();
    });
  })
  .catch(e => log.error(e));

ipcMain.on('persist', (_, track) => PersistTrack(track));

ipcMain.on('find-artwork', async(_, trackId: TrackId) => {
  const track   = trackRepository.getTrack(trackId);
  const results = await FindArtwork(track.title, track.artist);
  if(results.length){
    const artsDto: ArtsTrackDTO = {
      reqTrack: track,
      artsUrls: results,
    };
    createArtsWindow(artsDto);
  }
});

ipcMain.on('open-folder', async event => {
  const resultPath = await dialog.showOpenDialog({ properties: [ 'openDirectory' ] });

  if(resultPath.canceled) return;

  // trackRepository.removeAll();

  const files           = await GetFilesFrom(resultPath.filePaths[0]);
  const tracks: Track[] = await CreateTracks(files);
  trackRepository?.addAll(tracks);

  event.sender.send('tracks-updated');
});

ipcMain.on('get-all', event => {
  const tracks = trackRepository?.all();
  event.sender.send('all-tracks', tracks);
});

ipcMain.on('get-track', (event, trackId) => (event.returnValue = trackRepository.getTrack(trackId)));

ipcMain.on('fix-all', async event => {
  const tracks = trackRepository.all();
  await Promise.all(
    tracks.map(async track => {
      const updated = await FixTags(track);
      trackRepository.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on('fix-track', async(event, trackId) => {
  const track   = trackRepository.getTrack(trackId);
  const updated = await FixTags(track);
  trackRepository.update(updated);
  event.sender.send('tracks-updated');
});

ipcMain.on('fix-tracks', async(event, trackIds: TrackId[]) => {
  await Promise.all(
    trackIds.map(async trackId => {
      const updated = await FixTags(trackRepository.getTrack(trackId));
      trackRepository.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on('save-artwork', async(_, artTrack) => {
  const newTrack = await UpdateArtwork(artTrack);
  trackRepository.update(newTrack);
  mainWindow?.webContents.send('tracks-updated');
  artsWindow?.close();
  artsWindow?.destroy();
});
