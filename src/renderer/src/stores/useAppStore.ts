import { Artwork, Track } from '@preload/emusik';
import { create } from 'zustand';

interface AppState {
  appBarHeight: number;
  contentHeight: number;
  statusBarMessage: string;
  updateMessage: (message: string) => void;
  updateHeight: (height: number) => void;
  getArtImage: (track: Track) => Promise<Artwork | null>;
}

const APPBAR_HEIGHT = 80;
const STATUSBAR_HEIGHT = 30;

const useAppStore = create<AppState>(set => ({
  appBarHeight: APPBAR_HEIGHT,
  contentHeight: 100,
  statusBarMessage: '',
  updateMessage: (message: string) => {
    set({ statusBarMessage: message });
    setTimeout(() => set({ statusBarMessage: '' }), 5000);
  },
  updateHeight: (height: number) => set({ contentHeight: height - (APPBAR_HEIGHT + STATUSBAR_HEIGHT) }),
  getArtImage: async (track: Track) => {
    const art = await window.Main.getArtWork(track.path);
    return art;
  },
}));

export default useAppStore;
