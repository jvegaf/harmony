import { TrackRepository } from './services/track/track.repository';
// Native
import { join } from 'path';

// Packages
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import isDev from 'electron-is-dev';
import { AppLogger } from './services/log/app.logger';
import { GetFilesFrom } from './services/fileManager';
import PersistTrack from './services/tag/nodeId3Saver';
import FindArtwork from './services/tagger/artworkFinder';
import FixTags from './services/tagger/Tagger';
import CreateTracks from './services/track/track.creator';
import { Track, ArtsTrackDTO, TrackId } from './types/emusik';
import UpdateArtwork from './services/track/artwork.updater';

const log = AppLogger.getInstance();

log.info('app start');

let mainWindow: BrowserWindow | null = null;
let artsWindow: BrowserWindow | null = null;

const trackRepository = new TrackRepository();

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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow?.loadFile(url);
  }
  // Open the DevTools.
  // if (process.env.NODE_ENV === 'development') {
  // }
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
    artsWindow.webContents.openDevTools();
  } else {
    artsWindow?.loadFile(url);
  }
  // Open the DevTools.
  // if (process.env.NODE_ENV === 'development') {
  // }

  artsWindow.setMenu(null);

  artsWindow.webContents.on('did-finish-load', () => {
    artsWindow?.webContents.send('dto', artsDTO);
  });

  artsWindow.once('ready-to-show', () => {
    artsWindow?.show();
  });
}

app.whenReady().then(() => {
  createMainWindow();
  log.info('app ready');
  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('persist', (_, track) => PersistTrack(track));

ipcMain.on('find-artwork', async (_, trackId: TrackId) => {
  const track = trackRepository.getTrack(trackId);
  const results = await FindArtwork(track.title, track.artist);
  if (results.length) {
    const artsDto: ArtsTrackDTO = {
      reqTrack: track,
      artsUrls: results
    };
    createArtsWindow(artsDto);
  }
});

ipcMain.on('open-folder', async (event) => {
  const resultPath = await dialog.showOpenDialog(mainWindow as BrowserWindow, {
    properties: ['openDirectory']
  });

  if (resultPath.canceled) return;

  trackRepository.removeAll();

  const files = await GetFilesFrom(resultPath.filePaths[0]);
  const tracks: Track[] = await CreateTracks(files);
  tracks.forEach((t) => trackRepository.add(t));

  event.sender.send('tracks-updated');
});

ipcMain.on('get-all', (event) => {
  const tracks = trackRepository.all();
  event.sender.send('all-tracks', tracks);
});

ipcMain.on('get-track', (event, trackId) => (event.returnValue = trackRepository.getTrack(trackId)));

ipcMain.on('fix-all', async (event) => {
  const tracks = trackRepository.all();
  await Promise.all(
    tracks.map(async (track) => {
      const updated = await FixTags(track);
      trackRepository.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on('fix-track', async (event, trackId) => {
  const track = trackRepository.getTrack(trackId);
  const updated = await FixTags(track);
  trackRepository.update(updated);
  event.sender.send('track-fixed', trackId);
});

ipcMain.on('fix-tracks', async (event, trackIds: TrackId[]) => {
  await Promise.all(
    trackIds.map(async (trackId) => {
      const updated = await FixTags(trackRepository.getTrack(trackId));
      trackRepository.update(updated);
    })
  );
  event.sender.send('tracks-updated');
});

ipcMain.on('save-artwork', async (_, artTrack) => {
  const newTrack = await UpdateArtwork(artTrack);
  mainWindow?.webContents.send('track-saved', newTrack.id);
  artsWindow?.close();
  artsWindow?.destroy();
});
