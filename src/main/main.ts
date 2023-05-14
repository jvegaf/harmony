/* eslint-disable @typescript-eslint/no-var-requires */
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainEvent,
  Menu,
  MenuItemConstructorOptions,
  PopupOptions,
  shell,
} from 'electron';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import type { Track } from '../shared/types/emusik';
import { LogCategory } from '../shared/types/emusik';
import { GetFilesFrom } from './services/fileManager';
import PersistTrack from './services/tag/nodeId3Saver';
import FixTags from './services/tagger/Tagger';
import { resolveHtmlPath } from './util';
import FindArtwork from './services/tagger/artworkFinder';
import UpdateArtwork from './services/artwork/updater';
import {
  ARTWORK_UPDATED,
  FIND_ARTWORK,
  FIX_COMMAND,
  FIX_TRACK,
  NEW_TRACK,
  OPEN_FOLDER,
  PERSIST,
  PLAY_COMMAND,
  SAVE_ARTWORK,
  SHOW_CONTEXT_MENU,
  TRACK_UPDATED,
  VIEW_DETAIL_COMMAND,
} from '../shared/types/channels';
import CreateTrack from './services/track/creator';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

process.on('warning', (e) => console.warn(e.stack));

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
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createMainWindow = async () => {
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

  mainWindow.menuBarVisible = false;

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
  mainWindow.webContents.setWindowOpenHandler((edata) => {
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
    createMainWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createMainWindow();
    });
  })
  .catch((e) => log.error(e));

ipcMain.on(PERSIST, (_, track) => PersistTrack(track));

ipcMain.handle(FIND_ARTWORK, async (_, track: Track) => {
  const results = await FindArtwork(track);
  return results;
});

ipcMain.on(OPEN_FOLDER, async (event) => {
  const resultPath = await dialog.showOpenDialog({ properties: ['openDirectory'] });

  if (resultPath.canceled) return;

  const files = await GetFilesFrom(resultPath.filePaths[0]);

  files.forEach(async (file) => {
    const track = await CreateTrack(file);

    if (track !== null) {
      log.info(`Track created: ${track.title}`);
      event.sender.send(NEW_TRACK, track);
    }
  });
});

ipcMain.on(FIX_TRACK, async (event: IpcMainEvent, track: Track) => {
  const updated = await FixTags(track);
  event.sender.send(TRACK_UPDATED, updated);
});

ipcMain.on(SAVE_ARTWORK, async (event, artTrack) => {
  const newTrack = await UpdateArtwork(artTrack);
  event.sender.send(ARTWORK_UPDATED, newTrack);
});

ipcMain.on(SHOW_CONTEXT_MENU, (event: IpcMainEvent, selected: Track[]) => {
  const templateSingle = [
    {
      label: 'View Details',
      click: () => {
        event.sender.send(VIEW_DETAIL_COMMAND, selected[0]);
      },
    },
    {
      label: 'Play Track',
      click: () => {
        event.sender.send(PLAY_COMMAND, selected[0]);
      },
    },
    { type: 'separator' },
    {
      label: 'Fix Track',
      click: () => {
        event.sender.send(FIX_COMMAND, selected);
      },
    },
  ] as MenuItemConstructorOptions[];

  const templateMultiple = [
    {
      label: `Fix this ${selected.length} Tracks`,
      click: () => {
        event.sender.send(FIX_COMMAND, selected);
      },
    },
  ] as MenuItemConstructorOptions[];

  const template = selected.length > 1 ? templateMultiple : templateSingle;

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
});

ipcMain.on('log', (_, ...props) => {
  const [category, ...params] = props;

  switch (category) {
    case LogCategory.Info:
      log.info(...params);
      break;

    case LogCategory.Error:
      log.error(params);
      break;

    case LogCategory.Debug:
      log.debug(params);
      break;

    case LogCategory.Warn:
      log.warn(params);
      break;

    case LogCategory.Verbose:
      log.verbose(params);
      break;
  }
});