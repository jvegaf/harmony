import '@testing-library/jest-dom';
import { vi } from 'vitest';

// AIDEV-NOTE: Mock window.Main API para tests de renderer
// Este mock replica la estructura de src/preload/index.ts
global.window.Main = {
  app: {
    ready: vi.fn(),
    restart: vi.fn(),
    close: vi.fn(),
    getLogs: vi.fn().mockResolvedValue([]),
  },
  config: {
    __initialConfig: {},
    getAll: vi.fn().mockResolvedValue({}),
    get: vi.fn(),
    set: vi.fn(),
  },
  db: {
    tracks: {
      getAll: vi.fn().mockResolvedValue([]),
      insertMultiple: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findByID: vi.fn(),
      findByPath: vi.fn(),
      findOnlyByID: vi.fn(),
      findOnlyByPath: vi.fn(),
    },
    playlists: {
      getAll: vi.fn().mockResolvedValue([]),
      insert: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
      findByID: vi.fn(),
      findOnlyByID: vi.fn(),
      setTracks: vi.fn(),
      reorderTracks: vi.fn(),
    },
    reset: vi.fn(),
  },
  library: {
    parseUri: vi.fn(),
    fixTags: vi.fn(),
    findTagCandidates: vi.fn(),
    applyTagSelections: vi.fn(),
    onTagCandidatesProgress: vi.fn().mockReturnValue(() => {}),
    onTagAutoApplyComplete: vi.fn().mockReturnValue(() => {}),
    scanPaths: vi.fn(),
    importTracks: vi.fn(),
    importLibraryFull: vi.fn().mockResolvedValue({ success: true, tracksAdded: 0 }),
    onImportProgress: vi.fn().mockReturnValue(() => {}),
    checkChanges: vi.fn(),
    updateRating: vi.fn(),
    updateMetadata: vi.fn(),
    deleteTracks: vi.fn(),
    replaceFile: vi.fn(),
  },
  playlists: {
    resolveM3U: vi.fn(),
  },
  dialog: {
    open: vi.fn(),
    msgbox: vi.fn(),
  },
  covers: {
    getCoverAsBase64: vi.fn().mockResolvedValue(''),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  menu: {
    tracklist: vi.fn(),
    common: vi.fn(),
    playlist: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
    openUserDataDirectory: vi.fn(),
  },
} as any;

// AIDEV-NOTE: Mock CSS imports para evitar errores de parsing
vi.mock('*.css', () => ({}));
vi.mock('*.module.css', () => ({}));

// AIDEV-NOTE: Mock AG Grid para tests rápidos
// AG Grid es pesado y no necesitamos renderizarlo en unit tests
vi.mock('ag-grid-react', () => ({
  AgGridReact: vi.fn().mockImplementation(() => null),
}));

// Import store mocks
import './mocks/stores';
