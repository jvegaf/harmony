import {create} from 'zustand';

interface AppState {
  libHeight: number;
  updateHeight: (height: number) => void;
}

const useAppStore = create<AppState>(set => ({
  libHeight: 0,
  updateHeight: (height: number) => set({libHeight: height}),
}));

export default useAppStore;
