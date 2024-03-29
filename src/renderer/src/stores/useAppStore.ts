import { create } from 'zustand';

interface AppState {
  appBarHeight: number;
  contentHeight: number;
  updateHeight: (height: number) => void;
}

const APPBAR_HEIGHT = 80;

const useAppStore = create<AppState>(set => ({
  appBarHeight: APPBAR_HEIGHT,
  contentHeight: 100,
  updateHeight: (height: number) => set({ contentHeight: height - APPBAR_HEIGHT }),
}));

export default useAppStore;
