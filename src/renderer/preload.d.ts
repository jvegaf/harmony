declare global {
  interface Window {
    ipc: {
      /* ELECTRON IPC TYPES */
      send(channel: string, args: unknown);
      receive(channel: string, callBack: (...args: unknown[]) => void);
      /* ELECTRON IPC TYPES */
      set: (key: string, val: unknown) => void;
      get: (key: string) => unknown;
      openFolder: () => void;
      showContextMenu: (selected: TrackId[]) => void;
      fixTracks: (tracks: TrackId[]) => void;
      persistTrack: (track: Track) => void;
      fixAll: () => void;
      getTrack: (trackId: TrackId) => Track;
      getAll: () => Track[];
      log: (...args: any[]) => void;
      findArtWork: (track: Track) => void;
      saveArtWork: (artTrack: any) => void;
    };
  }
}

export {};