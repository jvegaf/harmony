import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import type { Track, Playlist } from '@preload/types/harmony';

// AIDEV-NOTE: Factory para crear tracks de prueba
export const createMockTrack = (overrides?: Partial<Track>): Track => ({
  id: 'track-1',
  title: 'Test Track',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 180,
  path: '/path/to/track.mp3',
  genre: 'Electronic',
  year: 2024,
  bpm: 128,
  bitrate: 320000,
  initialKey: 'Am',
  rating: undefined,
  ...overrides,
});

// AIDEV-NOTE: Factory para crear playlists de prueba
export const createMockPlaylist = (overrides?: Partial<Playlist>): Playlist => ({
  id: 'playlist-1',
  name: 'Test Playlist',
  tracks: [],
  ...overrides,
});

// AIDEV-NOTE: Factory para crear múltiples tracks (útil para dataset de 2600)
export const createMockTracks = (count: number): Track[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockTrack({
      id: `track-${i + 1}`,
      title: `Track ${i + 1}`,
      artist: `Artist ${(i % 10) + 1}`,
      genre: ['House', 'Techno', 'Trance', 'Drum & Bass'][i % 4],
      bpm: 120 + (i % 30),
    }),
  );
};

// AIDEV-NOTE: Wrapper personalizado para render con todos los providers necesarios
export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  // Por ahora no tenemos providers específicos, pero podríamos agregar:
  // - Zustand store provider
  // - Router provider
  // - Theme provider
  return render(ui, { ...options });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
