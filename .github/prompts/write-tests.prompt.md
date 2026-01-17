---
mode: 'agent'
model: Claude Sonnet 4
tools: ['codebase', 'create', 'edit']
description: 'Generate comprehensive tests for Harmony components and services'
---

# Write Tests for Harmony

You are a testing expert working on Harmony, an Electron-based music manager. Your goal is to create comprehensive tests that provide confidence in the codebase and catch regressions.

## Testing Strategy for Harmony

### Test Pyramid Structure
- **70% Unit Tests** - Individual functions, components, services
- **20% Integration Tests** - IPC communication, database operations, component interactions
- **10% E2E Tests** - Complete user workflows

### Testing Principles
1. **Test behavior, not implementation** - Focus on what the code does
2. **Write tests that provide confidence** - Catch real bugs and prevent regressions
3. **Keep tests simple and readable** - Tests are documentation
4. **Fast feedback loops** - Unit tests should run quickly

## React Component Testing

### Component Test Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackItem } from '../TrackItem';
import { createMockTrack } from '../../test-utils/mocks';
import { TestProviders } from '../../test-utils/providers';

describe('TrackItem', () => {
  const mockTrack = createMockTrack();
  const mockOnPlay = jest.fn();
  const mockOnEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <TestProviders>
        <TrackItem
          track={mockTrack}
          onPlay={mockOnPlay}
          onEdit={mockOnEdit}
          {...props}
        />
      </TestProviders>
    );
  };

  it('displays track information correctly', () => {
    renderComponent();

    expect(screen.getByText(mockTrack.title)).toBeInTheDocument();
    expect(screen.getByText(mockTrack.artist)).toBeInTheDocument();
    expect(screen.getByText(formatDuration(mockTrack.duration))).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    renderComponent();

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(mockOnPlay).toHaveBeenCalledWith(mockTrack);
    expect(mockOnPlay).toHaveBeenCalledTimes(1);
  });

  it('handles missing optional track data gracefully', () => {
    const trackWithoutArtist = createMockTrack({ artist: undefined });

    renderComponent({ track: trackWithoutArtist });

    expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
  });

  it('shows playing state when track is current', () => {
    const playingTrack = createMockTrack({ isPlaying: true });

    renderComponent({ track: playingTrack });

    expect(screen.getByTestId('playing-indicator')).toBeInTheDocument();
  });
});
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '../useAudioPlayer';
import { TestProviders } from '../../test-utils/providers';

describe('useAudioPlayer', () => {
  const renderUseAudioPlayer = () => {
    return renderHook(() => useAudioPlayer(), {
      wrapper: TestProviders
    });
  };

  it('initializes with default state', () => {
    const { result } = renderUseAudioPlayer();

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTrack).toBeNull();
    expect(result.current.volume).toBe(0.8);
  });

  it('plays track and updates state', async () => {
    const { result } = renderUseAudioPlayer();
    const mockTrack = createMockTrack();

    await act(async () => {
      await result.current.playTrack(mockTrack);
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTrack).toEqual(mockTrack);
  });

  it('handles audio loading errors gracefully', async () => {
    const { result } = renderUseAudioPlayer();
    const invalidTrack = createMockTrack({ filePath: '/invalid/path.mp3' });

    await act(async () => {
      await result.current.playTrack(invalidTrack);
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.error).toContain('Failed to load audio');
  });
});
```

## Service Layer Testing

### Service Test Template
```typescript
import { TrackService } from '../TrackService';
import { MockTrackRepository } from '../../test-utils/mocks';
import { ValidationError, NotFoundError } from '../errors';

describe('TrackService', () => {
  let trackService: TrackService;
  let mockRepository: jest.Mocked<TrackRepository>;

  beforeEach(() => {
    mockRepository = new MockTrackRepository();
    trackService = new TrackService(mockRepository, mockFileService);
  });

  describe('updateTrack', () => {
    it('successfully updates track with valid data', async () => {
      const trackId = 'track-123';
      const updates = { title: 'Updated Title', rating: 4 };
      const existingTrack = createMockTrack({ id: trackId });
      const updatedTrack = { ...existingTrack, ...updates };

      mockRepository.findById.mockResolvedValue(existingTrack);
      mockRepository.update.mockResolvedValue(updatedTrack);

      const result = await trackService.updateTrack(trackId, updates);

      expect(result).toEqual(updatedTrack);
      expect(mockRepository.update).toHaveBeenCalledWith(trackId, updates);
    });

    it('validates rating is within acceptable range', async () => {
      const trackId = 'track-123';
      const invalidUpdates = { rating: 10 }; // Rating should be 1-5

      await expect(trackService.updateTrack(trackId, invalidUpdates))
        .rejects.toThrow(ValidationError);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when track does not exist', async () => {
      const nonExistentTrackId = 'nonexistent';
      const updates = { title: 'New Title' };

      mockRepository.findById.mockResolvedValue(null);

      await expect(trackService.updateTrack(nonExistentTrackId, updates))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('importFromFile', () => {
    it('extracts metadata and saves track', async () => {
      const filePath = '/path/to/track.mp3';
      const metadata = createMockMetadata();
      const savedTrack = createMockTrack(metadata);

      mockFileService.extractMetadata.mockResolvedValue(metadata);
      mockRepository.save.mockResolvedValue(savedTrack);

      const result = await trackService.importFromFile(filePath);

      expect(result).toEqual(savedTrack);
      expect(mockFileService.extractMetadata).toHaveBeenCalledWith(filePath);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ filePath, ...metadata })
      );
    });

    it('handles unsupported file formats', async () => {
      const invalidFilePath = '/path/to/document.pdf';

      mockFileService.extractMetadata.mockRejectedValue(
        new Error('Unsupported file format')
      );

      await expect(trackService.importFromFile(invalidFilePath))
        .rejects.toThrow('Unsupported file format');
    });
  });
});
```

## IPC Testing

### IPC Communication Tests
```typescript
import { IPCTrackModule } from '../IPCTrackModule';
import { ipcMain } from 'electron';
import { channels } from '@preload/lib/ipc-channels';

describe('IPCTrackModule', () => {
  let module: IPCTrackModule;
  let mockTrackService: jest.Mocked<TrackService>;

  beforeEach(() => {
    mockTrackService = {
      updateTrack: jest.fn(),
      deleteTrack: jest.fn(),
      findTrack: jest.fn(),
    };
    module = new IPCTrackModule(mockTrackService);
    module.load();
  });

  afterEach(() => {
    ipcMain.removeAllListeners();
  });

  it('handles track update requests successfully', async () => {
    const request = {
      id: 'track-123',
      updates: { title: 'Updated Title' }
    };
    const updatedTrack = createMockTrack(request.updates);

    mockTrackService.updateTrack.mockResolvedValue(updatedTrack);

    // Simulate IPC call
    const handlers = ipcMain.listeners(channels.TRACK_UPDATE);
    const handler = handlers[0] as Function;

    const response = await handler(null, request);

    expect(response).toEqual({
      success: true,
      data: updatedTrack
    });
    expect(mockTrackService.updateTrack).toHaveBeenCalledWith(
      request.id,
      request.updates
    );
  });

  it('returns error response when service throws', async () => {
    const request = { id: 'invalid-id', updates: { title: '' } };
    const serviceError = new ValidationError('Title cannot be empty');

    mockTrackService.updateTrack.mockRejectedValue(serviceError);

    const handlers = ipcMain.listeners(channels.TRACK_UPDATE);
    const handler = handlers[0] as Function;

    const response = await handler(null, request);

    expect(response).toMatchObject({
      success: false,
      error: expect.stringContaining('Title cannot be empty')
    });
  });

  it('validates IPC message structure', async () => {
    const invalidRequest = { invalidField: 'value' };

    const handlers = ipcMain.listeners(channels.TRACK_UPDATE);
    const handler = handlers[0] as Function;

    const response = await handler(null, invalidRequest);

    expect(response).toMatchObject({
      success: false,
      error: expect.stringContaining('Invalid request format')
    });
  });
});
```

## Database Integration Testing

### Database Test Template
```typescript
import { DataSource } from 'typeorm';
import { TrackEntity } from '@main/lib/db/entities/TrackEntity';
import { createTestDataSource } from '../../test-utils/database';

describe('Track Database Operations', () => {
  let dataSource: DataSource;
  let trackRepository: Repository<TrackEntity>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    trackRepository = dataSource.getRepository(TrackEntity);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await trackRepository.clear();
  });

  it('saves and retrieves track with all fields', async () => {
    const trackData = createMockTrack({
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      genre: 'Electronic',
      rating: 4
    });

    const savedTrack = await trackRepository.save(trackData);
    const retrievedTrack = await trackRepository.findOne({
      where: { id: savedTrack.id }
    });

    expect(retrievedTrack).toMatchObject(trackData);
    expect(retrievedTrack?.id).toBe(savedTrack.id);
  });

  it('finds tracks by genre with proper indexing', async () => {
    const rockTracks = [
      createMockTrack({ genre: 'Rock', title: 'Rock Song 1' }),
      createMockTrack({ genre: 'Rock', title: 'Rock Song 2' })
    ];
    const jazzTrack = createMockTrack({ genre: 'Jazz', title: 'Jazz Song' });

    await trackRepository.save([...rockTracks, jazzTrack]);

    const foundRockTracks = await trackRepository.find({
      where: { genre: 'Rock' }
    });

    expect(foundRockTracks).toHaveLength(2);
    expect(foundRockTracks.every(track => track.genre === 'Rock')).toBe(true);
  });

  it('handles database constraints correctly', async () => {
    const trackWithDuplicateFilePath = createMockTrack({
      filePath: '/duplicate/path.mp3'
    });

    await trackRepository.save(trackWithDuplicateFilePath);

    // Should throw constraint error for duplicate file path
    await expect(
      trackRepository.save({ ...trackWithDuplicateFilePath, id: undefined })
    ).rejects.toThrow();
  });
});
```

## Test Utilities and Mocks

### Mock Data Factory
```typescript
// test-utils/mocks.ts
export const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: `track-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Sample Track',
  artist: 'Sample Artist',
  album: 'Sample Album',
  genre: 'Electronic',
  filePath: '/path/to/sample.mp3',
  duration: 180000,
  rating: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockPlaylist = (overrides: Partial<Playlist> = {}): Playlist => ({
  id: `playlist-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Sample Playlist',
  tracks: [createMockTrack()],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export class MockTrackRepository {
  findById = jest.fn();
  find = jest.fn();
  save = jest.fn();
  update = jest.fn();
  delete = jest.fn();
  clear = jest.fn();
}
```

### Test Providers
```typescript
// test-utils/providers.tsx
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

export const TestProviders = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  </MantineProvider>
);
```

## Performance Testing

### Memory Leak Detection
```typescript
describe('Memory Management', () => {
  it('does not leak memory when processing many tracks', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Process many tracks
    for (let i = 0; i < 1000; i++) {
      await trackProcessor.process(createMockTrack());
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory should not increase significantly
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
  });
});
```

### Load Testing
```typescript
describe('Library Performance', () => {
  it('handles loading 10,000 tracks efficiently', async () => {
    const startTime = performance.now();

    // Create large dataset
    const largeTracks = Array.from({ length: 10000 }, (_, i) =>
      createMockTrack({
        id: `track-${i}`,
        title: `Track ${i}`
      })
    );

    await trackRepository.save(largeTracks);

    const loadedTracks = await trackService.getAllTracks();
    const endTime = performance.now();

    expect(loadedTracks).toHaveLength(10000);
    expect(endTime - startTime).toBeLessThan(1000); // Should load in under 1 second
  });
});
```

## Test Implementation Steps

1. **Analyze the Code to Test**
   - What is the primary functionality?
   - What are the edge cases and error conditions?
   - What external dependencies need mocking?
   - What state changes occur?

2. **Set Up Test Environment**
   - Create necessary mocks and test utilities
   - Set up test database or other resources
   - Configure test providers and wrappers

3. **Write Unit Tests**
   - Test happy path scenarios
   - Test edge cases and error conditions
   - Test state changes and side effects
   - Verify proper cleanup

4. **Write Integration Tests**
   - Test component interactions
   - Test IPC communication
   - Test database operations
   - Test API integrations

5. **Verify Test Quality**
   - Check test coverage
   - Ensure tests catch real bugs
   - Verify tests are readable and maintainable
   - Run tests in CI environment

## Questions to Ask

When writing tests, consider:

1. **What should this code do?** (Happy path)
2. **What could go wrong?** (Error cases)
3. **How does it interact with other parts?** (Integration)
4. **What state changes occur?** (Side effects)
5. **How can users misuse it?** (Edge cases)
6. **What performance characteristics matter?** (Load testing)

## Test Quality Checklist

- [ ] Tests are readable and well-documented
- [ ] All major functionality is covered
- [ ] Edge cases and error conditions are tested
- [ ] Mocks are used appropriately for external dependencies
- [ ] Tests run quickly (under 1 second for unit tests)
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests provide good error messages when they fail
- [ ] Integration tests cover critical workflows
- [ ] Performance tests validate acceptable limits
- [ ] Tests follow naming conventions and organization

Generate comprehensive tests following these guidelines and ask for clarification if the testing requirements are unclear.
