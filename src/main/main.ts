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
import { CREATE_TRACKS, FIX_COMMAND, FIX_TRACKS, NEW_TRACK, OPEN_FOLDER, PLAY_COMMAND, SAVE_ARTWORK, TOTAL_FILES, VIEW_DETAIL_COMMAND } from 'src/shared/types/channels';
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

ipcMain.on(OPEN_FOLDER, async (event) => {
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

ipcMain.on(CREATE_TRACKS, async (event, files: string[]) => {
  files.forEach(async (file) => {
    const track = await CreateTrack(file);
    if (track !== null) event.sender.send(NEW_TRACK, track);
  })

});
ipcMain.on(FIX_TRACKS, async (event, tracks: TrackId[]) => {
  await Promise.all(
    tracks.map(async (trackId) => {
      const track = trackRepository?.getTrack(trackId);
      const updated = await FixTags(track as Track);
      trackRepository?.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on(SAVE_ARTWORK, async (_, artTrack) => {
  const newTrack = await UpdateArtwork(artTrack);
  trackRepository?.update(newTrack);
  mainWindow?.webContents.send('artwork-saved');
});

ipcMain.on('show-context-menu', (event: IpcMainEvent, selected: TrackId[]) => {
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
        event.sender.send(FIX_COMMAND, selected[0]);
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
