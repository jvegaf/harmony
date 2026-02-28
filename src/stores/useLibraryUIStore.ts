import { Track } from '@/types/harmony';
import { createStore } from './store-helpers';
import { config, logger } from '@/lib/tauri-api';

type LibraryUIState = {
  search: string;
  searched: Track | null;
  renamingPlaylist: string | null;
  tracklistSort: {
    colId: string;
    mode: string;
  };
  refreshing: boolean;
  fixing: boolean;
  tagsSelecting: boolean;
  deleting: boolean;
  checking: boolean;
  applyingChanges: boolean;
  refresh: {
    processed: number;
    total: number;
  };
  fix: {
    processed: number;
    total: number;
  };
  applyChangesProgress: {
    processed: number;
    total: number;
  };
  api: {
    setSearch: (value: string) => void;
    setSearched: (trackSearched: Track | null) => void;
    setRenamingPlaylist: (playlistID: string | null) => void;
    setTracklistSort: (colId: string, mode: string) => Promise<void>;
    setRefreshing: (value: boolean) => void;
    setRefreshProgress: (processed: number, total: number) => void;
    setFixing: (value: boolean) => void;
    setFixProgress: (processed: number, total: number) => void;
    setTagsSelecting: (value: boolean) => void;
    setDeleting: (value: boolean) => void;
    setChecking: (value: boolean) => void;
    setApplyingChanges: (value: boolean) => void;
    setApplyChangesProgress: (processed: number, total: number) => void;
  };
};

// See docs/aidev-notes/tracklist-sorting.md for details on sort persistence
// AIDEV-NOTE: Handle case where config is not yet loaded (will be loaded async on app start)
const initialTracklistSort = config.__initialConfig?.tracklistSort || { colId: 'path', mode: 'desc' };

const useLibraryUIStore = createStore<LibraryUIState>(set => ({
  search: '',
  searched: null,
  renamingPlaylist: null,
  tracklistSort: initialTracklistSort,
  refreshing: false,
  fixing: false,
  tagsSelecting: false,
  deleting: false,
  checking: false,
  applyingChanges: false,
  refresh: {
    processed: 0,
    total: 0,
  },
  fix: {
    processed: 0,
    total: 0,
  },
  applyChangesProgress: {
    processed: 0,
    total: 0,
  },
  api: {
    setSearch: (search: string): void => {
      set({ search });
    },
    setSearched: (trackSearched: Track | null) => set({ searched: trackSearched }),
    setRenamingPlaylist: (playlistID: string | null): void => {
      set({ renamingPlaylist: playlistID });
    },
    setTracklistSort: async (colId: string, mode: string): Promise<void> => {
      const tracklistSort = { colId, mode };
      set({ tracklistSort });
      await config.set('tracklistSort', tracklistSort);
      logger.debug('Tracklist sort saved:', tracklistSort);
    },
    setRefreshing: (value: boolean): void => {
      set({ refreshing: value });
    },
    setRefreshProgress: (processed: number, total: number): void => {
      set({ refresh: { processed, total } });
    },
    setFixing: (value: boolean): void => {
      set({ fixing: value });
    },
    setFixProgress: (processed: number, total: number): void => {
      set({ fix: { processed, total } });
    },
    setTagsSelecting: (value: boolean): void => {
      set({ tagsSelecting: value });
    },
    setDeleting: (value: boolean): void => {
      set({ deleting: value });
    },
    setChecking: (value: boolean): void => {
      set({ checking: value });
    },
    setApplyingChanges: (value: boolean): void => {
      set({ applyingChanges: value });
    },
    setApplyChangesProgress: (processed: number, total: number): void => {
      set({ applyChangesProgress: { processed, total } });
    },
  },
}));

export default useLibraryUIStore;

export function useLibraryUIAPI() {
  return useLibraryUIStore(state => state.api);
}
