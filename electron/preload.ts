import { ipcRenderer, contextBridge } from 'electron';
import { TrackId, ArtTrack, Track } from './types/emusik';

declare global {
  interface Window {
    Main: typeof api;
    ipcRenderer: typeof ipcRenderer;
  }
}

const api = {
  /**
   * Here you can expose functions to the renderer process
   * so they can interact with the main (electron) side
   * without security problems.
   *
   * The function below can accessed using `window.Main.sayHello`
   */
  PersistTrack: (track: Track) => ipcRenderer.send('persist', track),
  OpenFolder: () => ipcRenderer.send('open-folder'),
  FixAll: () => ipcRenderer.send('fix-all'),
  FixTrack: (trackId: TrackId) => ipcRenderer.send('fix-track', trackId),
  FixTracks: (trackIds: TrackId[]) => ipcRenderer.send('fix-tracks', trackIds),
  FindArtwork: (trackId: TrackId) => ipcRenderer.send('find-artwork', trackId),
  SaveArtwork: (artTrack: ArtTrack) => ipcRenderer.send('save-artwork', artTrack),
  GetTrack: (trackId: TrackId): Track => ipcRenderer.sendSync('get-track', trackId),
  GetAll: () => ipcRenderer.send('get-all'),
  /**
   * Provide an easier way to listen to events
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.on(channel, (_, data) => callback(data));
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.once(channel, (_, data) => callback(data));
  }
};
contextBridge.exposeInMainWorld('Main', api);
/**
 * Using the ipcRenderer directly in the browser through the contextBridge ist not really secure.
 * I advise using the Main/api way !!
 */
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
