import { ipcRenderer, contextBridge } from 'electron';

const artApi = {
  /**
   * Here you can expose functions to the renderer process
   * so they can interact with the main (electron) side
   * without security problems.
   *
   * The function below can accessed using `window.Main.sayHello`
   */
  SaveArtwork: (artUrl: string) => ipcRenderer.send('save-artwork', artUrl),
  // PersistTrack: (track: Track) => ipcRenderer.send('persist', track),
  // OpenFolder: (): Promise<Track[]> => ipcRenderer.invoke('open-folder'),
  // FixTrack: (track: Track): Promise<Track> => ipcRenderer.invoke('fix-track', track),
  // FixTracks: (tracks: Track[]): Promise<Track[]> => ipcRenderer.invoke('fix-tracks', tracks),
  // FindArtwork: (track: Track): Promise<string[]> => ipcRenderer.invoke('find-artwork', track),
  /**
   * Provide an easier way to listen to events
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on:          (channel: string, callback: (data: any) => void) => {
    ipcRenderer.on(channel, (_, data) => callback(data));
  },
};
contextBridge.exposeInMainWorld('Main', artApi);
/**
 * Using the ipcRenderer directly in the browser through the contextBridge ist not really secure.
 * I advise using the Main/api way !!
 */
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);
