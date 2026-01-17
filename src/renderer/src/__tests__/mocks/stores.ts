import { vi } from 'vitest';

// AIDEV-NOTE: Mock de useLibraryStore
// Ver src/renderer/src/stores/useLibraryStore.ts para la estructura real
export const mockUseLibraryStore = vi.fn(() => ({
  searched: null,
  updated: null,
  deleting: false,
  tracklistSort: null,
}));

export const mockUseLibraryAPI = vi.fn(() => ({
  setSearched: vi.fn(),
  setTracklistSort: vi.fn(),
}));

// AIDEV-NOTE: Mock de usePlayerStore
// Ver src/renderer/src/stores/usePlayerStore.ts para la estructura real
export const mockUsePlayerAPI = vi.fn(() => ({
  start: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  stop: vi.fn(),
}));

// Setup de mocks globales para los stores
vi.mock('@renderer/stores/useLibraryStore', () => ({
  default: mockUseLibraryStore,
  useLibraryAPI: mockUseLibraryAPI,
}));

vi.mock('@renderer/stores/usePlayerStore', () => ({
  usePlayerAPI: mockUsePlayerAPI,
}));
