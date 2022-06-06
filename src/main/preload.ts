import { contextBridge, ipcRenderer } from 'electron';
import { Track } from 'shared/types/emusik';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping');
    },
    openFolder() {
      ipcRenderer.send('open-folder');
    },
    showContextMenu(trackId: string) {
      ipcRenderer.send('show-context-menu', trackId);
    },
    fixTracks(tracks: Track[]) {
      ipcRenderer.send('fix-tracks', tracks);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(channel: string, func: (...args: any[]) => void) {
      const validChannels = [
        'ipc-example',
        'add-tracks',
        'track-fixed',
        'tracks-fixed',
        'view-detail-command',
        'play-command',
        'fix-track-command',
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (_event, ...args) => func(...args));
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    once(channel: string, func: (...args: any[]) => void) {
      const validChannels = [
        'ipc-example',
        'add-tracks',
        'track-fixed',
        'tracks-fixed',
        'view-detail-command',
        'play-command',
        'fix-track-command',
      ];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (_event, ...args) => func(...args));
      }
    },
  },
});
