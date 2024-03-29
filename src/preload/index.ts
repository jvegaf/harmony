import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { OPEN_FOLDER, FIX_TRACK, PERSIST, GET_ARTWORK } from './channels';
import { ArtTrack, Artwork, Track, TrackSrc } from './emusik';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}

// Custom APIs for renderer
const api = {
  openFolder: async () => ipcRenderer.invoke(OPEN_FOLDER),
  fixTrack: (track: Track) => ipcRenderer.send(FIX_TRACK, track),
  persistTrack: (track: Track) => ipcRenderer.send(PERSIST, track),
  log: (...args: any[]) => ipcRenderer.send('log', ...args),
  findArtWork: async (track: Track) => ipcRenderer.invoke('find-artwork', track),
  saveArtWork: (artTrack: ArtTrack) => ipcRenderer.send('save-artwork', artTrack),
  getArtWork: (filepath: TrackSrc): Promise<Artwork | null> => ipcRenderer.invoke(GET_ARTWORK, filepath),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(channel: string, func: (...args: any[]) => void) {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(channel: string, func: (...args: any[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('ipcRenderer', electronAPI);
    contextBridge.exposeInMainWorld('Main', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.ipcRenderer = electronAPI;
  // @ts-ignore (define in dts)
  window.Main = api;
}
