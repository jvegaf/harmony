---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts"
description: "Testing standards and best practices for Harmony desktop app"
---

# Testing Guidelines for Harmony

## Testing Philosophy

### Test Pyramid Structure
- **Unit Tests** (70%) - Test individual functions, components, and modules in isolation
- **Integration Tests** (20%) - Test interactions between modules, IPC communication, database operations
- **End-to-End Tests** (10%) - Test complete user workflows and critical app functionality

### Core Testing Principles
- **Test behavior, not implementation** - Focus on what the code does, not how it does it
- **Write tests that provide confidence** - Tests should catch real bugs and prevent regressions
- **Keep tests simple and readable** - Tests are documentation of expected behavior
- **Fast feedback** - Unit tests should run quickly for rapid development cycles

## Unit Testing Standards

### React Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackItem } from '../TrackItem';
import { mockTrack } from '../../test-utils/mocks';

describe('TrackItem', () => {
  const mockOnPlay = jest.fn();
  const mockOnEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays track title and artist', () => {
    render(
      <TrackItem
        track={mockTrack}
        onPlay={mockOnPlay}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText(mockTrack.title)).toBeInTheDocument();
    expect(screen.getByText(mockTrack.artist)).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    render(
      <TrackItem
        track={mockTrack}
        onPlay={mockOnPlay}
        onEdit={mockOnEdit}
      />
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(mockOnPlay).toHaveBeenCalledWith(mockTrack);
    expect(mockOnPlay).toHaveBeenCalledTimes(1);
  });

  it('handles missing optional properties gracefully', () => {
    const trackWithoutArtist = { ...mockTrack, artist: undefined };

    render(
      <TrackItem
        track={trackWithoutArtist}
        onPlay={mockOnPlay}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText(trackWithoutArtist.title)).toBeInTheDocument();
    expect(screen.queryByText('Unknown Artist')).toBeInTheDocument();
  });
});
```

### Service Layer Testing
```typescript
import { TrackService } from '../TrackService';
import { MockTrackRepository } from '../../test-utils/mocks';
import { ValidationError } from '../errors';

describe('TrackService', () => {
  let trackService: TrackService;
  let mockRepository: jest.Mocked<TrackRepository>;

  beforeEach(() => {
    mockRepository = new MockTrackRepository();
    trackService = new TrackService(mockRepository);
  });

  describe('updateTrack', () => {
    it('updates track successfully with valid data', async () => {
      const trackId = 'track-123';
      const updates = { title: 'New Title', rating: 4 };
      const updatedTrack = { ...mockTrack, ...updates };

      mockRepository.findById.mockResolvedValue(mockTrack);
      mockRepository.update.mockResolvedValue(updatedTrack);

      const result = await trackService.updateTrack(trackId, updates);

      expect(result).toEqual(updatedTrack);
      expect(mockRepository.update).toHaveBeenCalledWith(trackId, updates);
    });

    it('throws ValidationError for invalid rating', async () => {
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
        .rejects.toThrow('Track not found');
    });
  });
});
```

### Async Operation Testing
```typescript
describe('AudioFileProcessor', () => {
  let processor: AudioFileProcessor;
  let mockFileSystem: jest.Mocked<FileSystemService>;

  beforeEach(() => {
    mockFileSystem = {
      exists: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
    };
    processor = new AudioFileProcessor(mockFileSystem);
  });

  it('processes audio file metadata correctly', async () => {
    const filePath = '/path/to/audio.mp3';
    const expectedMetadata = {
      title: 'Song Title',
      artist: 'Artist Name',
      duration: 180000
    };

    mockFileSystem.exists.mockResolvedValue(true);
    mockFileSystem.readFile.mockResolvedValue(mockAudioBuffer);

    const result = await processor.extractMetadata(filePath);

    expect(result).toMatchObject(expectedMetadata);
    expect(mockFileSystem.exists).toHaveBeenCalledWith(filePath);
  });

  it('handles file not found error gracefully', async () => {
    const filePath = '/nonexistent/file.mp3';

    mockFileSystem.exists.mockResolvedValue(false);

    await expect(processor.extractMetadata(filePath))
      .rejects.toThrow('File not found');
  });
});
```

## Integration Testing

### IPC Communication Testing
```typescript
import { ipcMain, ipcRenderer } from 'electron';
import { TrackIPCHandler } from '../TrackIPCHandler';
import { channels } from '@preload/lib/ipc-channels';

describe('Track IPC Integration', () => {
  let handler: TrackIPCHandler;
  let mockTrackService: jest.Mocked<TrackService>;

  beforeEach(() => {
    mockTrackService = {
      updateTrack: jest.fn(),
      deleteTrack: jest.fn(),
      findTrack: jest.fn(),
    };
    handler = new TrackIPCHandler(mockTrackService);
    handler.registerHandlers();
  });

  afterEach(() => {
    ipcMain.removeAllListeners();
  });

  it('handles track update request correctly', async () => {
    const request = {
      id: 'track-123',
      updates: { title: 'Updated Title' }
    };
    const expectedResponse = { success: true, data: mockUpdatedTrack };

    mockTrackService.updateTrack.mockResolvedValue(mockUpdatedTrack);

    // Simulate IPC call
    const response = await new Promise((resolve) => {
      ipcMain.handle(channels.TRACK_UPDATE, async (event, data) => {
        const result = await handler.handleTrackUpdate(data);
        resolve(result);
      });

      // Trigger the handler
      ipcRenderer.invoke(channels.TRACK_UPDATE, request);
    });

    expect(response).toEqual(expectedResponse);
    expect(mockTrackService.updateTrack).toHaveBeenCalledWith(request.id, request.updates);
  });

  it('returns error response when service throws', async () => {
    const request = { id: 'invalid-id', updates: { title: '' } };
    const serviceError = new ValidationError('Title cannot be empty');

    mockTrackService.updateTrack.mockRejectedValue(serviceError);

    const response = await handler.handleTrackUpdate(request);

    expect(response).toMatchObject({
      success: false,
      error: expect.stringContaining('Title cannot be empty')
    });
  });
});
```

### Database Integration Testing
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

  it('saves and retrieves track correctly', async () => {
    const trackData = {
      title: 'Test Track',
      artist: 'Test Artist',
      filePath: '/test/path.mp3',
      duration: 180000
    };

    const savedTrack = await trackRepository.save(trackData);
    const retrievedTrack = await trackRepository.findOne({
      where: { id: savedTrack.id }
    });

    expect(retrievedTrack).toMatchObject(trackData);
    expect(retrievedTrack?.id).toBe(savedTrack.id);
  });

  it('finds tracks by genre efficiently', async () => {
    const rockTracks = [
      { title: 'Rock Song 1', artist: 'Artist 1', genre: 'Rock', filePath: '/path1.mp3' },
      { title: 'Rock Song 2', artist: 'Artist 2', genre: 'Rock', filePath: '/path2.mp3' }
    ];
    const jazzTrack = { title: 'Jazz Song', artist: 'Jazz Artist', genre: 'Jazz', filePath: '/path3.mp3' };

    await trackRepository.save([...rockTracks, jazzTrack]);

    const foundRockTracks = await trackRepository.find({
      where: { genre: 'Rock' }
    });

    expect(foundRockTracks).toHaveLength(2);
    expect(foundRockTracks.every(track => track.genre === 'Rock')).toBe(true);
  });
});
```

## End-to-End Testing

### User Workflow Testing
```typescript
import { Application } from 'spectron';
import { join } from 'path';

describe('Harmony E2E Tests', () => {
  let app: Application;

  beforeEach(async () => {
    app = new Application({
      path: join(__dirname, '../../../dist/electron/main.js'),
      args: ['--test-mode'],
      startTimeout: 10000,
    });
    await app.start();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('loads the main window', async () => {
    const count = await app.client.getWindowCount();
    expect(count).toBe(1);

    const title = await app.client.getTitle();
    expect(title).toBe('Harmony');
  });

  it('can add a track to library', async () => {
    // Navigate to library view
    await app.client.click('[data-testid="library-tab"]');

    // Click add track button
    await app.client.click('[data-testid="add-track-button"]');

    // Fill in track details
    await app.client.setValue('[data-testid="track-title-input"]', 'Test Track');
    await app.client.setValue('[data-testid="track-artist-input"]', 'Test Artist');

    // Submit form
    await app.client.click('[data-testid="save-track-button"]');

    // Verify track appears in library
    await app.client.waitForExist('[data-testid="track-item"]');
    const trackTitle = await app.client.getText('[data-testid="track-title"]');
    expect(trackTitle).toBe('Test Track');
  });

  it('can play a track', async () => {
    // Setup: Add a track first
    await addTestTrack(app);

    // Click play button
    await app.client.click('[data-testid="play-button"]');

    // Verify player state
    await app.client.waitForExist('[data-testid="now-playing"]');
    const nowPlayingText = await app.client.getText('[data-testid="now-playing"]');
    expect(nowPlayingText).toContain('Test Track');

    const playButton = await app.client.getAttribute('[data-testid="play-button"]', 'aria-label');
    expect(playButton).toBe('Pause');
  });
});
```

## Test Utilities and Mocks

### Mock Data Factory
```typescript
// test-utils/mocks.ts
export const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 'track-123',
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
  id: 'playlist-123',
  name: 'Sample Playlist',
  tracks: [createMockTrack()],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Mock repository class
export class MockTrackRepository {
  findById = jest.fn();
  find = jest.fn();
  save = jest.fn();
  update = jest.fn();
  delete = jest.fn();
}
```

### Test Database Setup
```typescript
// test-utils/database.ts
import { DataSource } from 'typeorm';
import { TrackEntity, PlaylistEntity } from '@main/lib/db/entities';

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [TrackEntity, PlaylistEntity],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function seedTestData(dataSource: DataSource): Promise<void> {
  const trackRepository = dataSource.getRepository(TrackEntity);

  const testTracks = [
    createMockTrack({ title: 'Track 1', genre: 'Rock' }),
    createMockTrack({ title: 'Track 2', genre: 'Jazz' }),
    createMockTrack({ title: 'Track 3', genre: 'Electronic' })
  ];

  await trackRepository.save(testTracks);
}
```

### Custom Testing Hooks
```typescript
// test-utils/hooks.ts
import { renderHook, act } from '@testing-library/react';
import { createWrapper } from './providers';

export function renderHookWithProviders<T>(
  hook: () => T,
  options?: { initialProps?: any }
) {
  return renderHook(hook, {
    wrapper: createWrapper(),
    ...options
  });
}

export function createWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <MantineProvider>
      <QueryClient client={testQueryClient}>
        {children}
      </QueryClient>
    </MantineProvider>
  );
}
```

## Testing Best Practices

### DO's
- **Use descriptive test names** that explain the expected behavior
- **Follow AAA pattern** - Arrange, Act, Assert
- **Test edge cases** and error conditions
- **Use proper cleanup** in beforeEach/afterEach hooks
- **Mock external dependencies** to isolate units under test
- **Use data-testid attributes** for reliable element selection
- **Test accessibility** with screen reader and keyboard navigation

### DON'Ts
- **Don't test implementation details** - focus on observable behavior
- **Don't write overly complex tests** - tests should be simple and readable
- **Don't test third-party libraries** - assume they work correctly
- **Don't use brittle selectors** - avoid CSS selectors that might change
- **Don't forget to clean up** - remove event listeners, timers, and subscriptions
- **Don't test everything** - focus on critical paths and complex logic

### Test Organization
```typescript
describe('AudioPlayer', () => {
  // Setup and teardown
  beforeEach(() => {
    // Common setup
  });

  afterEach(() => {
    // Cleanup
  });

  // Group related tests
  describe('when playing a track', () => {
    it('updates the current time', () => {
      // Test implementation
    });

    it('emits playback events', () => {
      // Test implementation
    });
  });

  describe('when track ends', () => {
    it('advances to next track in playlist', () => {
      // Test implementation
    });

    it('stops if no next track exists', () => {
      // Test implementation
    });
  });
});
```

## Performance Testing

### Load Testing for Large Libraries
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

### Memory Leak Testing
```typescript
describe('Memory Management', () => {
  it('does not leak memory when processing many files', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Process many files
    for (let i = 0; i < 1000; i++) {
      await audioProcessor.process(createMockAudioFile());
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

## Testing Commands

### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration"
  }
}
```

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  moduleNameMapping: {
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/src/$1',
    '^@preload/(.*)$': '<rootDir>/src/preload/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-utils/**',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```
