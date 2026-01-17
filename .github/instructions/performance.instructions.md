<!-- Based on: https://github.com/github/awesome-copilot/main/instructions/performance-optimization.instructions.md -->
---
applyTo: "**/*.ts,**/*.tsx,**/*.js"
description: "Performance optimization guidelines for Harmony Electron desktop app"
---

# Performance Optimization for Harmony

## Core Performance Principles

### Measure First, Optimize Second
- **Profile before optimizing** - use Chrome DevTools, Electron DevTools
- **Focus on real bottlenecks** - don't optimize based on assumptions
- **Set performance budgets** - define acceptable limits for app startup, UI responsiveness
- **Monitor continuously** - integrate performance testing into development workflow

### Electron-Specific Performance

#### Process Management
```typescript
// Keep main process non-blocking
class DatabaseService {
  async loadTracks(): Promise<Track[]> {
    // GOOD: Async database operations
    return await this.repository.find();
  }

  // BAD: Never block the main process
  // loadTracksSync(): Track[] {
  //   return this.repository.findSync(); // Blocks entire app
  // }
}
```

#### Memory Management
```typescript
// Cleanup resources properly
class AudioPlayer {
  private audioContext?: AudioContext;

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
    }
  }
}

// Use object pooling for frequent allocations
class AudioBufferPool {
  private available: AudioBuffer[] = [];
  private inUse = new Set<AudioBuffer>();

  acquire(): AudioBuffer {
    let buffer = this.available.pop();
    if (!buffer) {
      buffer = new AudioBuffer({ length: 1024, sampleRate: 44100, numberOfChannels: 2 });
    }
    this.inUse.add(buffer);
    return buffer;
  }

  release(buffer: AudioBuffer): void {
    this.inUse.delete(buffer);
    this.available.push(buffer);
  }
}
```

## Frontend Performance (React)

### Component Optimization
```typescript
import { memo, useMemo, useCallback } from 'react';

// Use React.memo for expensive components
export const TrackList = memo<TrackListProps>(({ tracks, onTrackSelect }) => {
  // Memoize expensive computations
  const sortedTracks = useMemo(() => {
    return tracks.sort((a, b) => a.title.localeCompare(b.title));
  }, [tracks]);

  // Memoize callbacks to prevent child re-renders
  const handleTrackClick = useCallback((trackId: string) => {
    onTrackSelect(trackId);
  }, [onTrackSelect]);

  return (
    <div>
      {sortedTracks.map(track => (
        <TrackItem
          key={track.id}
          track={track}
          onClick={handleTrackClick}
        />
      ))}
    </div>
  );
});
```

### Virtualization for Large Lists
```typescript
import { FixedSizeList as List } from 'react-window';

interface VirtualTrackListProps {
  tracks: Track[];
  height: number;
}

export const VirtualTrackList = ({ tracks, height }: VirtualTrackListProps) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TrackItem track={tracks[index]} />
    </div>
  );

  return (
    <List
      height={height}
      itemCount={tracks.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Efficient State Updates
```typescript
import { useReducer, useCallback } from 'react';

// Use useReducer for complex state updates
interface PlaylistState {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
}

type PlaylistAction =
  | { type: 'ADD_TRACK'; track: Track }
  | { type: 'REMOVE_TRACK'; trackId: string }
  | { type: 'SET_CURRENT'; index: number }
  | { type: 'TOGGLE_PLAY' };

const playlistReducer = (state: PlaylistState, action: PlaylistAction): PlaylistState => {
  switch (action.type) {
    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.track] };
    case 'REMOVE_TRACK':
      return {
        ...state,
        tracks: state.tracks.filter(t => t.id !== action.trackId)
      };
    case 'SET_CURRENT':
      return { ...state, currentIndex: action.index };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    default:
      return state;
  }
};
```

## Database Performance

### Query Optimization
```typescript
@Entity()
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index() // Index frequently queried fields
  title: string;

  @Column()
  @Index()
  artist: string;

  @Column()
  @Index()
  genre: string;

  @Column('int')
  @Index()
  rating: number;
}

// Efficient queries with proper indexes
export class TrackRepository {
  // Use specific columns, not SELECT *
  async findByGenre(genre: string): Promise<Pick<Track, 'id' | 'title' | 'artist'>[]> {
    return this.repository
      .createQueryBuilder('track')
      .select(['track.id', 'track.title', 'track.artist'])
      .where('track.genre = :genre', { genre })
      .getMany();
  }

  // Use pagination for large result sets
  async findWithPagination(page: number, limit: number): Promise<Track[]> {
    return this.repository.find({
      skip: page * limit,
      take: limit,
      order: { title: 'ASC' }
    });
  }

  // Batch operations for better performance
  async updateMultipleTracks(updates: Array<{ id: string; rating: number }>): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(Track)
      .set({ rating: () => 'CASE id ' + updates.map(u => `WHEN '${u.id}' THEN ${u.rating}`).join(' ') + ' END' })
      .where('id IN (:...ids)', { ids: updates.map(u => u.id) })
      .execute();
  }
}
```

### Connection Pooling
```typescript
// Configure database connection pool
export const createDataSource = () => {
  return new DataSource({
    type: 'sqlite',
    database: getDatabasePath(),
    entities: [Track, Playlist, PlaylistTrack],
    synchronize: process.env.NODE_ENV === 'development',
    // Connection pool settings
    extra: {
      connectionLimit: 5,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    }
  });
};
```

## File System Performance

### Efficient File Operations
```typescript
import { promises as fs } from 'fs';
import { Worker } from 'worker_threads';

class AudioFileProcessor {
  private workers = new Pool<Worker>(() => new Worker('./audio-worker.js'));

  // Process files in batches to avoid overwhelming the system
  async processAudioFiles(filePaths: string[]): Promise<ProcessedFile[]> {
    const batchSize = 10;
    const results: ProcessedFile[] = [];

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(path => this.processFile(path))
      );
      results.push(...batchResults);

      // Allow other operations between batches
      await new Promise(resolve => setImmediate(resolve));
    }

    return results;
  }

  // Use streaming for large files
  async analyzeAudioFile(filePath: string): Promise<AudioAnalysis> {
    const readStream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024 // 64KB chunks
    });

    return new Promise((resolve, reject) => {
      const analyzer = new AudioAnalyzer();

      readStream.on('data', chunk => {
        analyzer.processChunk(chunk);
      });

      readStream.on('end', () => {
        resolve(analyzer.getResult());
      });

      readStream.on('error', reject);
    });
  }
}
```

### Caching Strategies
```typescript
// LRU cache for frequently accessed data
class AudioMetadataCache {
  private cache = new Map<string, { data: AudioMetadata; timestamp: number }>();
  private readonly maxSize = 1000;
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  get(filePath: string): AudioMetadata | null {
    const entry = this.cache.get(filePath);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(filePath);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(filePath);
    this.cache.set(filePath, entry);

    return entry.data;
  }

  set(filePath: string, metadata: AudioMetadata): void {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(filePath, {
      data: metadata,
      timestamp: Date.now()
    });
  }
}
```

## Network Performance

### Request Batching and Debouncing
```typescript
class MusicServiceClient {
  private requestQueue: SearchRequest[] = [];
  private batchTimer?: NodeJS.Timeout;

  // Batch multiple search requests
  searchTracks(query: string): Promise<SearchResult> {
    return new Promise((resolve, reject) => {
      const request = { query, resolve, reject };
      this.requestQueue.push(request);

      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }

      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, 50); // 50ms debounce
    });
  }

  private async processBatch(): Promise<void> {
    const requests = this.requestQueue.splice(0);
    if (requests.length === 0) return;

    try {
      // Combine queries into single API call
      const queries = requests.map(r => r.query);
      const results = await this.batchSearch(queries);

      requests.forEach((request, index) => {
        request.resolve(results[index]);
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }
}
```

## Memory Management

### Prevent Memory Leaks
```typescript
class ComponentWithCleanup extends React.Component {
  private subscription?: Subscription;
  private intervalId?: NodeJS.Timeout;

  componentDidMount() {
    // Set up subscriptions
    this.subscription = audioPlayer.subscribe(this.handleAudioUpdate);
    this.intervalId = setInterval(this.updateProgress, 1000);
  }

  componentWillUnmount() {
    // Always clean up resources
    this.subscription?.unsubscribe();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private handleAudioUpdate = (state: AudioState) => {
    // Use arrow function to avoid binding issues
    this.setState({ audioState: state });
  }
}

// Use WeakMap for object-based caches to prevent memory leaks
class TrackAnalysisCache {
  private cache = new WeakMap<Track, AnalysisResult>();

  get(track: Track): AnalysisResult | undefined {
    return this.cache.get(track);
  }

  set(track: Track, result: AnalysisResult): void {
    this.cache.set(track, result);
  }
}
```

## Startup Performance

### Lazy Loading and Code Splitting
```typescript
// Lazy load heavy components
const WaveformVisualizer = React.lazy(() =>
  import('./WaveformVisualizer').then(module => ({
    default: module.WaveformVisualizer
  }))
);

// Code splitting for different app sections
const LibraryView = React.lazy(() => import('@renderer/views/LibraryView'));
const PlaylistView = React.lazy(() => import('@renderer/views/PlaylistView'));
const SettingsView = React.lazy(() => import('@renderer/views/SettingsView'));

// Preload critical modules
class ModulePreloader {
  static async preloadCritical(): Promise<void> {
    // Preload essential modules in parallel
    await Promise.all([
      import('@main/services/AudioService'),
      import('@main/services/DatabaseService'),
      import('@renderer/stores/PlayerStore')
    ]);
  }
}
```

### Application Initialization
```typescript
class HarmonyApplication {
  private initializationTasks: Array<() => Promise<void>> = [];

  // Prioritize initialization tasks
  async initialize(): Promise<void> {
    // Critical tasks first
    await this.initializeDatabase();
    await this.initializeAudioSystem();

    // Secondary tasks in parallel
    await Promise.all([
      this.loadUserSettings(),
      this.loadPlugins(),
      this.initializeMetadataCache()
    ]);

    // Background tasks
    setImmediate(() => {
      this.indexMusicLibrary();
      this.checkForUpdates();
    });
  }

  private async initializeDatabase(): Promise<void> {
    const startTime = performance.now();
    await DatabaseService.initialize();
    log.info(`Database initialized in ${performance.now() - startTime}ms`);
  }
}
```

## Performance Monitoring

### Real-time Performance Tracking
```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  markStart(operation: string): string {
    const id = `${operation}-${Date.now()}-${Math.random()}`;
    performance.mark(`${id}-start`);
    return id;
  }

  markEnd(id: string): number {
    performance.mark(`${id}-end`);
    performance.measure(id, `${id}-start`, `${id}-end`);

    const measure = performance.getEntriesByName(id)[0];
    const duration = measure.duration;

    // Track metrics
    const operation = id.split('-')[0];
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Clean up
    performance.clearMarks(`${id}-start`);
    performance.clearMarks(`${id}-end`);
    performance.clearMeasures(id);

    return duration;
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.length ? times.reduce((a, b) => a + b) / times.length : 0;
  }
}

// Usage throughout the app
const perf = new PerformanceMonitor();

async function processAudioFile(path: string): Promise<void> {
  const markId = perf.markStart('audio-processing');
  try {
    // Process audio file
    await audioProcessor.process(path);
  } finally {
    const duration = perf.markEnd(markId);
    if (duration > 1000) { // Log slow operations
      log.warn(`Slow audio processing: ${duration}ms for ${path}`);
    }
  }
}
```

## Performance Best Practices Checklist

### React Components
- [ ] Use React.memo for expensive components
- [ ] Implement proper key props for list items
- [ ] Use useMemo/useCallback judiciously (only for expensive operations)
- [ ] Avoid anonymous functions in JSX props
- [ ] Use virtualization for large lists (>100 items)

### Database
- [ ] Add indexes to frequently queried columns
- [ ] Use specific SELECT queries instead of SELECT *
- [ ] Implement pagination for large datasets
- [ ] Use batch operations for bulk updates
- [ ] Monitor query performance and slow query logs

### File System
- [ ] Use streaming for large files
- [ ] Implement proper caching with TTL
- [ ] Process files in batches to avoid blocking
- [ ] Clean up temporary files and resources

### Memory Management
- [ ] Clean up event listeners and subscriptions
- [ ] Use object pooling for frequently created objects
- [ ] Monitor memory usage and heap size
- [ ] Use WeakMap/WeakSet for object-based caches

### Network
- [ ] Batch API requests when possible
- [ ] Implement request debouncing for user input
- [ ] Cache frequently requested data
- [ ] Use compression for large responses

## Common Performance Anti-Patterns

### Avoid These Patterns
```typescript
// BAD: Blocking the main process
const tracks = fs.readdirSync(musicDir); // Synchronous I/O

// BAD: Creating new objects in render
const TrackItem = ({ track }) => {
  const style = { color: track.isPlaying ? 'green' : 'black' }; // New object every render
  return <div style={style}>{track.title}</div>;
};

// BAD: Inefficient database queries
const allTracks = await repository.find(); // Loads all data
const filteredTracks = allTracks.filter(t => t.genre === 'rock');

// BAD: Memory leaks
componentDidMount() {
  setInterval(() => {
    this.updateTime();
  }, 1000);
  // No cleanup in componentWillUnmount!
}
```

### Follow These Patterns
```typescript
// GOOD: Non-blocking operations
const tracks = await fs.readdir(musicDir); // Async I/O

// GOOD: Stable object references
const styles = { playing: { color: 'green' }, paused: { color: 'black' } };
const TrackItem = ({ track }) => {
  const style = track.isPlaying ? styles.playing : styles.paused;
  return <div style={style}>{track.title}</div>;
};

// GOOD: Efficient database queries
const rockTracks = await repository.find({ where: { genre: 'rock' } });

// GOOD: Proper cleanup
useEffect(() => {
  const interval = setInterval(updateTime, 1000);
  return () => clearInterval(interval);
}, []);
```
