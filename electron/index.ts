// Native
import { join } from 'path';

// Packages
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainEvent,
  Menu,
  MenuItemConstructorOptions,
  PopupOptions
} from 'electron';
import isDev from 'electron-is-dev';
import { GetFilesFrom } from './services/fileManager';
import PersistTrack from './services/tag/nodeId3Saver';
import FindArtwork from './services/tagger/artworkFinder';
import FixTags, { FixTracks } from './services/tagger/Tagger';
import { GetTracks } from './services/track/trackManager';
import { Track, ArtsTrackDTO } from './types/emusik';
import UpdateArtwork from './services/track/artworkUpdater';

let mainWindow: BrowserWindow | null = null;
let artsWindow: BrowserWindow | null = null;

function createMainWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1350,
    height: 900,
    show: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      webSecurity: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  const port = process.env.PORT || 3000;
  const url = isDev ? `http://localhost:${port}` : join(__dirname, '../src/out/index.html');

  // and load the index.html of the app.
  if (isDev) {
    mainWindow?.loadURL(url);
  } else {
    mainWindow?.loadFile(url);
  }
  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

function createArtsWindow(artsDTO: ArtsTrackDTO) {
  // Create the browser window.
  artsWindow = new BrowserWindow({
    width: 1100,
    height: 820,
    resizable: true,
    fullscreenable: false,
    minimizable: false,
    parent: mainWindow as BrowserWindow,
    modal: true,
    webPreferences: {
      webSecurity: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  const port = process.env.PORT || 3000;
  const url = isDev ? `http://localhost:${port}/artworks.html` : join(__dirname, '../src/out/artworks.html');

  // and load the index.html of the app.
  if (isDev) {
    artsWindow?.loadURL(url);
  } else {
    artsWindow?.loadFile(url);
  }
  // Open the DevTools.
  artsWindow.webContents.openDevTools();

  artsWindow.setMenu(null);

  artsWindow.webContents.on('did-finish-load', () => {
    console.log('did-finish-load:', artsWindow?.webContents.getTitle());
    artsWindow?.webContents.send('dto', artsDTO);
  });

  artsWindow.once('ready-to-show', () => {
    artsWindow?.show();

    console.log('ready-to-show');
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('show-context-menu', (event: IpcMainEvent, selected: Track[]) => {
  const templateSingle = [
    {
      label: 'View Details',
      click: () => {
        event.sender.send('view-detail-command', selected[0]);
      }
    },
    {
      label: 'Play Track',
      click: () => {
        event.sender.send('play-command', selected[0]);
      }
    },
    { type: 'separator' },
    {
      label: 'Fix Track',
      click: () => {
        event.sender.send('fix-track-command', selected[0]);
      }
    }
  ] as MenuItemConstructorOptions[];

  const templateMultiple = [
    {
      label: `Fix this ${selected.length} Tracks`,
      click: () => {
        event.sender.send('fix-tracks-command', selected);
      }
    }
  ] as MenuItemConstructorOptions[];

  const template = selected.length > 1 ? templateMultiple : templateSingle;

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender) as PopupOptions);
});

ipcMain.on('persist', (_, track) => PersistTrack(track));

ipcMain.on('find-artwork', async (_, track: Track) => {
  const results = await FindArtwork(track.title, track.artist);
  if (results.length) {
    const artsDto: ArtsTrackDTO = {
      reqTrack: track,
      artsUrls: results
    };
    createArtsWindow(artsDto);
  }
});

ipcMain.handle('open-folder', async () => {
  const resultPath = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openDirectory']
  });

  if (resultPath.canceled) return null;
  console.log('path', resultPath);

  const files = await GetFilesFrom(resultPath.filePaths[0]);
  const tracks: Track[] = await GetTracks(files);
  return tracks;
});

ipcMain.handle('fix-track', async (_, track) => {
  const updated = await FixTags(track);
  return updated;
});

ipcMain.handle('fix-tracks', async (_, tracks) => {
  const fixed = await FixTracks(tracks);
  return fixed;
});

ipcMain.on('save-artwork', async (_, artTrack) => {
  const newTrack = await UpdateArtwork(artTrack);
  mainWindow?.webContents.send('track-saved', newTrack);
  artsWindow?.close();
  artsWindow?.destroy();
});
