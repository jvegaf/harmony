import { Artwork, Track } from '@preload/emusik';
import { create } from 'zustand';

interface AppState {
  appBarHeight: number;
  contentHeight: number;
  updateHeight: (height: number) => void;
  getArtImage: (track: Track) => Promise<Artwork | null>;
}

const APPBAR_HEIGHT = 80;

const useAppStore = create<AppState>(set => ({
  appBarHeight: APPBAR_HEIGHT,
  contentHeight: 100,
  updateHeight: (height: number) => set({ contentHeight: height - APPBAR_HEIGHT }),
  getArtImage: async (track: Track) => {
    const art = await window.Main.getArtWork(track.path);
    return art;
  },
}));

export default useAppStore;
