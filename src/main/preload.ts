import { contextBridge, ipcRenderer } from 'electron';
import type { Track, TrackId } from 'shared/types/emusik';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}
const api = {
  OpenFolder:   () => ipcRenderer.send('open-folder'),
  FixTrack:     (trackId: TrackId) => ipcRenderer.invoke('fix-track', trackId),
  FixTracks:    (trackIds: TrackId[]) => ipcRenderer.send('fix-tracks', trackIds),
  PersistTrack: (track: Track) => ipcRenderer.send('persist', track),
  FixAll:       () => ipcRenderer.send('fix-all'),
  GetTrack:     (trackId: TrackId) => ipcRenderer.sendSync('get-track', trackId),
  GetAll:       () => ipcRenderer.send('get-all'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Log:          (...args :any[]) => ipcRenderer.send('log', ...args),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(channel: string, func: (...args: any[]) => void){
    ipcRenderer.on(channel, (_event, ...args) => func(...args));
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(channel: string, func: (...args: any[]) => void){
    ipcRenderer.once(channel, (_event, ...args) => func(...args));
  }
};

contextBridge.exposeInMainWorld('Main', api);

contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
