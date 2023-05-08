// eslint-disable-next-line import/no-extraneous-dependencies
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
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import { isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions } from './utils';
import menu from './menu';
import './updater';
import { Track, TrackId } from 'src/shared/types/emusik';
import PersistTrack from './services/tag/nodeId3Saver';
import FindArtwork from './services/tagger/artworkFinder';
import UpdateArtwork from './services/artwork/updater';
import { GetFilesFrom } from './services/fileManager';
import FixTags from './services/tagger/Tagger';
import { TrackRepository } from './services/track/repository';
import { NEW_TRACK, TOTAL_FILES } from 'src/shared/types/channels';
import CreateTrack from './services/track/creator';

let trackRepository: TrackRepository | null = null;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: getAssetsPath('icon.ico'),
    width: 1100,
    height: 750,
    webPreferences: {
      devTools: isDebug,
      preload: getPreloadPath('preload.js'), // 👈 Don't USE PRELOAD.JS IF YOUR USING NODE IN RENDERER PROCESS
      // nodeIntegration: true, // 👈 NODE.JS WILL AVAILABLE IN RENDERER
      // contextIsolation: false, // 👈 ENABLE THIS FOR NODE INTEGRATION IN RENDERER
    },
  });

  mainWindow.loadURL(getHtmlPath('index.html'));

  /* MENU BUILDER */
  Menu.setApplicationMenu(menu);

  /* AUTO UPDATER INVOKE */
  autoUpdater.checkForUpdatesAndNotify();

  /* DEBUG DEVTOOLS */
  if (isDebug) {
    mainWindow.webContents.openDevTools(); // ELECTRON DEVTOOLS
    installExtensions(); // REACT DEVTOOLS INSTALLER
  }

  /* URLs OPEN IN DEFAULT BROWSER */
  mainWindow.webContents.setWindowOpenHandler((data) => {
    shell.openExternal(data.url);
    return { action: 'deny' };
  });
}

/* IPC EVENTS EXAMPLE */
ipcMain.on('message', (event, arg) => {
  // eslint-disable-next-line no-console
  console.log(`IPC Example: ${arg}`);
  event.reply('reply', 'Ipc Example:  pong 🏓');
});

/** ELECTRON STORE EXAMPLE
 *  NOTE: LOCAL STORAGE FOR YOUR APPLICATION
 */
const store = new Store();
ipcMain.on('set', (_event, key, val) => {
  // eslint-disable-next-line no-console
  console.log(`Electron Store Example: key: ${key}, value: ${val}`);
  store.set(key, val);
});
ipcMain.on('get', (event, val) => {
  // eslint-disable-next-line no-param-reassign
  event.returnValue = store.get(val);
});

app.whenReady().then(() => {
  trackRepository = new TrackRepository();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('persist', (_, track) => PersistTrack(track));

ipcMain.handle('find-artwork', async (_, track: Track) => {
  const results = await FindArtwork(track);
  return results;
});

ipcMain.on('open-folder', async (event) => {
  const resultPath = await dialog.showOpenDialog({ properties: ['openDirectory'] });

  if (resultPath.canceled) return;

  // trackRepository.removeAll();

  const files = await GetFilesFrom(resultPath.filePaths[0]);

  event.sender.send(TOTAL_FILES, files.length);

  files.forEach(async (file) => {
    const track = await CreateTrack(file);
    if (track !== null) event.sender.send(NEW_TRACK, track);
  });

  // event.sender.send('tracks-updated');
});

ipcMain.on('get-all', (event) => (event.returnValue = trackRepository?.all()));

ipcMain.on('get-track', (event, trackId) => (event.returnValue = trackRepository?.getTrack(trackId)));

ipcMain.on('fix-all', async (event) => {
  const tracks = trackRepository?.all();
  await Promise.all(
    (tracks as Track[]).map(async (track) => {
      const updated = await FixTags(track);
      trackRepository?.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on('fix-track', async (event, trackId) => {
  const track = trackRepository?.getTrack(trackId);
  const updated = await FixTags(track as Track);
  trackRepository?.update(updated);
  event.sender.send('tracks-updated');
});

ipcMain.on('fix-tracks', async (event, tracks: TrackId[]) => {
  await Promise.all(
    tracks.map(async (trackId) => {
      const track = trackRepository?.getTrack(trackId);
      const updated = await FixTags(track as Track);
      trackRepository?.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on('save-artwork', async (_, artTrack) => {
  const newTrack = await UpdateArtwork(artTrack);
  trackRepository?.update(newTrack);
  mainWindow?.webContents.send('artwork-saved');
});

ipcMain.on('show-context-menu', (event: IpcMainEvent, selected: TrackId[]) => {
  const templateSingle = [
    {
      label: 'View Details',
      click: () => {
        event.sender.send('view-detail-command', selected[0]);
      },
    },
    {
      label: 'Play Track',
      click: () => {
        event.sender.send('play-command', selected[0]);
      },
    },
    { type: 'separator' },
    {
      label: 'Fix Track',
      click: () => {
        event.sender.send('fix-track-command', selected[0]);
      },
    },
  ] as MenuItemConstructorOptions[];

  const templateMultiple = [
    {
      label: `Fix this ${selected.length} Tracks`,
      click: () => {
        event.sender.send('fix-tracks-command', selected);
      },
    },
  ] as MenuItemConstructorOptions[];

  const template = selected.length > 1 ? templateMultiple : templateSingle;

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
});

// ipcMain.on('log', (_, ...props) => {
//   const [category, ...params] = props;
//
//   switch (category) {
//     case LogCategory.Info:
//       log.info(...params);
//       break;
//
//     case LogCategory.Error:
//       log.error(params);
//       break;
//
//     case LogCategory.Debug:
//       log.debug(params);
//       break;
//
//     case LogCategory.Warn:
//       log.warn(params);
//       break;
//
//     case LogCategory.Verbose:
//       log.verbose(params);
//       break;
//   }
// });