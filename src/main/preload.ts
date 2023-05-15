/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextBridge, ipcRenderer } from 'electron';
import { FIX_TRACK, GET_ARTWORK, OPEN_FOLDER, PERSIST, SHOW_CONTEXT_MENU } from '../shared/types/channels';
import { ArtTrack, Artwork, Track, TrackSrc } from '../shared/types/emusik';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}
const api = {
  ShowContextMenu: (selected: Track[]) => ipcRenderer.send(SHOW_CONTEXT_MENU, selected),
  OpenFolder: () => ipcRenderer.send(OPEN_FOLDER),
  FixTrack: (track: Track) => ipcRenderer.send(FIX_TRACK, track),
  PersistTrack: (track: Track) => ipcRenderer.send(PERSIST, track),
  Log: (...args: any[]) => ipcRenderer.send('log', ...args),
  FindArtWork: async (track: Track) => ipcRenderer.invoke('find-artwork', track),
  SaveArtWork: (artTrack: ArtTrack) => ipcRenderer.send('save-artwork', artTrack),
  GetArtWork: (filepath: TrackSrc): Promise<Artwork | null> => ipcRenderer.invoke(GET_ARTWORK, filepath),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(channel: string, func: (...args: any[]) => void) {
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(channel: string, func: (...args: any[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  },
};

contextBridge.exposeInMainWorld('Main', api);

contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);