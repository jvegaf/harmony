import { logger } from '../../shared/lib';

import { createStore } from './store-helpers';

type AppState = {
  appBarHeight: number;
  contentWidth: number;
  contentHeight: number;
  api: {
    updateSize: (width: number, height: number) => void;
  };
};

const APPBAR_HEIGHT = 50;
const STATUSBAR_HEIGHT = 30;

const useAppStore = createStore<AppState>((set) => ({
  appBarHeight: APPBAR_HEIGHT,
  contentWidth: 100,
  contentHeight: 100,
  api: {
    updateSize: (width: number, height: number) => {
      // eslint-disable-next-line import/namespace, no-console
      console.log('updating app size', width, height);
      set({
        contentWidth: width,
        contentHeight: height - (APPBAR_HEIGHT + STATUSBAR_HEIGHT),
      });
    },
  },
}));

export default useAppStore;

export function useAppAPI() {
  return useAppStore((state) => state.api);
}
