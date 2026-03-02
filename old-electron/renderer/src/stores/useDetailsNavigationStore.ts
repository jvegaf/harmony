import { create } from 'zustand';
import { TrackId } from '../../../preload/types/harmony';

/**
 * Store for managing track navigation context in Details view.
 * Stores the current list of tracks being viewed and the current position.
 * Allows Previous/Next navigation while maintaining the original view context.
 */
type DetailsNavigationStore = {
  trackIds: TrackId[];
  currentIndex: number;
  originPath: string; // Path to return to when closing Details
  setContext: (trackIds: TrackId[], currentTrackId: TrackId, originPath: string) => void;
  getOriginPath: () => string;
  getCurrentTrackId: () => TrackId | null;
  getPreviousTrackId: () => TrackId | null;
  getNextTrackId: () => TrackId | null;
  navigateToPrevious: () => TrackId | null;
  navigateToNext: () => TrackId | null;
  clear: () => void;
};

export const useDetailsNavigationStore = create<DetailsNavigationStore>((set, get) => ({
  trackIds: [],
  currentIndex: -1,
  originPath: '/library', // Default to library

  setContext: (trackIds: TrackId[], currentTrackId: TrackId, originPath: string) => {
    const index = trackIds.indexOf(currentTrackId);
    set({ trackIds, currentIndex: index, originPath });
  },

  getOriginPath: () => {
    return get().originPath;
  },

  getCurrentTrackId: () => {
    const { trackIds, currentIndex } = get();
    if (currentIndex >= 0 && currentIndex < trackIds.length) {
      return trackIds[currentIndex];
    }
    return null;
  },

  getPreviousTrackId: () => {
    const { trackIds, currentIndex } = get();
    if (currentIndex > 0) {
      return trackIds[currentIndex - 1];
    }
    return null;
  },

  getNextTrackId: () => {
    const { trackIds, currentIndex } = get();
    if (currentIndex >= 0 && currentIndex < trackIds.length - 1) {
      return trackIds[currentIndex + 1];
    }
    return null;
  },

  navigateToPrevious: () => {
    const { trackIds, currentIndex } = get();
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      set({ currentIndex: newIndex });
      return trackIds[newIndex];
    }
    return null;
  },

  navigateToNext: () => {
    const { trackIds, currentIndex } = get();
    if (currentIndex >= 0 && currentIndex < trackIds.length - 1) {
      const newIndex = currentIndex + 1;
      set({ currentIndex: newIndex });
      return trackIds[newIndex];
    }
    return null;
  },

  clear: () => {
    set({ trackIds: [], currentIndex: -1, originPath: '/library' });
  },
}));

export const useDetailsNavigationAPI = () => {
  const store = useDetailsNavigationStore();
  return {
    setContext: store.setContext,
    getOriginPath: store.getOriginPath,
    getCurrentTrackId: store.getCurrentTrackId,
    getPreviousTrackId: store.getPreviousTrackId,
    getNextTrackId: store.getNextTrackId,
    navigateToPrevious: store.navigateToPrevious,
    navigateToNext: store.navigateToNext,
    clear: store.clear,
  };
};
