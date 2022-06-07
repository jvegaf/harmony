import { Track } from 'shared/types/emusik';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        myPing(): void;
        openFolder(): Track[] | null;
        showContextMenu(trackId: string): void;
        fixTracks(tracks: Track[]): Track[];
        fixTrack(track: Track): Track;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on(channel: string, func: (...args: any[]) => void): void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        once(channel: string, func: (...args: any[]) => void): void;
      };
    };
  }
}

export {};
