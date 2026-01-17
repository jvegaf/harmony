---
mode: 'agent'
model: Claude Sonnet 4
tools: ['codebase', 'edit', 'search']
description: 'Refactor existing Harmony code while preserving functionality'
---

# Refactor Code for Harmony

You are an expert software architect working on Harmony, an Electron-based music manager. Your goal is to improve code quality, maintainability, and performance through thoughtful refactoring while preserving all existing functionality.

## Refactoring Principles

### 1. Preserve Functionality
- **No behavior changes** - Refactoring should not alter what the code does
- **Maintain API contracts** - Public interfaces should remain unchanged
- **Keep test compatibility** - Existing tests should continue to pass
- **Preserve error handling** - Don't change error scenarios

### 2. Improve Code Quality
- **Reduce complexity** - Simplify complex functions and components
- **Eliminate duplication** - Extract common patterns into reusable utilities
- **Improve readability** - Make code more self-documenting
- **Enhance maintainability** - Make future changes easier

### 3. Follow Project Standards
- **TypeScript best practices** - Proper typing and modern patterns
- **React optimization** - Performance and hook patterns
- **Electron architecture** - Proper process separation
- **Harmony conventions** - Established project patterns

## Common Refactoring Scenarios

### 1. Extract Custom Hooks
```typescript
// ❌ BEFORE: Logic mixed in component
const TrackPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedData = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadeddata', handleLoadedData);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [audio]);

  const play = useCallback(() => {
    if (audio) {
      audio.play();
      setIsPlaying(true);
    }
  }, [audio]);

  const pause = useCallback(() => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  }, [audio]);

  // Component JSX...
};
```

```typescript
// ✅ AFTER: Extracted custom hook
const useAudioPlayer = (src?: string) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (src) {
      const audioElement = new Audio(src);
      setAudio(audioElement);
      return () => {
        audioElement.pause();
        audioElement.src = '';
      };
    }
  }, [src]);

  useEffect(() => {
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedData = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audio]);

  const play = useCallback(() => audio?.play(), [audio]);
  const pause = useCallback(() => audio?.pause(), [audio]);
  const seek = useCallback((time: number) => {
    if (audio) {
      audio.currentTime = time;
    }
  }, [audio]);

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek
  };
};

// Simplified component
const TrackPlayer = ({ track }: { track: Track }) => {
  const { isPlaying, currentTime, duration, play, pause, seek } = useAudioPlayer(track.filePath);

  // Component JSX...
};
```

### 2. Extract Service Classes
```typescript
// ❌ BEFORE: Mixed concerns in IPC handler
ipcMain.handle(channels.TRACK_IMPORT, async (event, filePath: string) => {
  try {
    // File validation
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const stats = fs.statSync(filePath);
    if (stats.size > 100 * 1024 * 1024) { // 100MB
      throw new Error('File too large');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!['.mp3', '.flac', '.wav'].includes(ext)) {
      throw new Error('Unsupported format');
    }

    // Metadata extraction
    let metadata;
    if (ext === '.mp3') {
      metadata = await extractMp3Metadata(filePath);
    } else if (ext === '.flac') {
      metadata = await extractFlacMetadata(filePath);
    } else {
      metadata = await extractWavMetadata(filePath);
    }

    // Database save
    const track = {
      id: generateId(),
      ...metadata,
      filePath,
      importedAt: new Date()
    };

    await trackRepository.save(track);

    return { success: true, data: track };
  } catch (error) {
    log.error('Track import failed:', error);
    return { success: false, error: error.message };
  }
});
```

```typescript
// ✅ AFTER: Extracted services with clear responsibilities
class FileValidationService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly SUPPORTED_FORMATS = ['.mp3', '.flac', '.wav'];

  static async validateAudioFile(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new ValidationError('File not found');
    }

    const stats = fs.statSync(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new ValidationError('File too large');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!this.SUPPORTED_FORMATS.includes(ext)) {
      throw new ValidationError(`Unsupported format: ${ext}`);
    }
  }
}

class MetadataExtractionService {
  private extractors = {
    '.mp3': this.extractMp3Metadata,
    '.flac': this.extractFlacMetadata,
    '.wav': this.extractWavMetadata
  };

  async extractMetadata(filePath: string): Promise<AudioMetadata> {
    const ext = path.extname(filePath).toLowerCase();
    const extractor = this.extractors[ext as keyof typeof this.extractors];

    if (!extractor) {
      throw new Error(`No metadata extractor for ${ext}`);
    }

    return await extractor(filePath);
  }

  private async extractMp3Metadata(filePath: string): Promise<AudioMetadata> {
    // MP3 extraction logic
  }

  private async extractFlacMetadata(filePath: string): Promise<AudioMetadata> {
    // FLAC extraction logic
  }

  private async extractWavMetadata(filePath: string): Promise<AudioMetadata> {
    // WAV extraction logic
  }
}

class TrackImportService {
  constructor(
    private metadataService: MetadataExtractionService,
    private trackRepository: Repository<Track>
  ) {}

  async importTrack(filePath: string): Promise<Track> {
    await FileValidationService.validateAudioFile(filePath);

    const metadata = await this.metadataService.extractMetadata(filePath);

    const track = {
      id: generateId(),
      ...metadata,
      filePath,
      importedAt: new Date()
    };

    return await this.trackRepository.save(track);
  }
}

// Simplified IPC handler
ipcMain.handle(channels.TRACK_IMPORT, async (event, filePath: string) => {
  try {
    const track = await trackImportService.importTrack(filePath);
    return { success: true, data: track };
  } catch (error) {
    log.error('Track import failed:', error);
    return {
      success: false,
      error: error instanceof ValidationError ? error.message : 'Import failed'
    };
  }
});
```

### 3. Simplify Complex Components
```typescript
// ❌ BEFORE: Large component with mixed concerns
const LibraryView = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Track>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Lots of complex logic...

  return (
    <div className={styles.container}>
      {/* Complex JSX with many inline handlers */}
    </div>
  );
};
```

```typescript
// ✅ AFTER: Decomposed into focused components
const useLibraryState = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.Main.tracks.getAll();
      setTracks(result.data);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  return { tracks, loading, refetch: loadTracks };
};

const LibraryFilters = ({ onFilterChange }: LibraryFiltersProps) => {
  // Filter component logic
};

const LibrarySort = ({ onSortChange }: LibrarySortProps) => {
  // Sort component logic
};

const LibraryTable = ({ tracks, onSelectionChange }: LibraryTableProps) => {
  // Table component logic
};

const LibraryView = () => {
  const { tracks, loading, refetch } = useLibraryState();
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

  const handleFilterChange = useCallback((filters: LibraryFilters) => {
    const filtered = applyFilters(tracks, filters);
    setFilteredTracks(filtered);
  }, [tracks]);

  const handleSortChange = useCallback((sort: SortConfig) => {
    const sorted = applySorting(filteredTracks, sort);
    setFilteredTracks(sorted);
  }, [filteredTracks]);

  return (
    <div className={styles.container}>
      <LibraryFilters onFilterChange={handleFilterChange} />
      <LibrarySort onSortChange={handleSortChange} />
      <LibraryTable
        tracks={filteredTracks}
        loading={loading}
        onRefetch={refetch}
      />
    </div>
  );
};
```

### 4. Eliminate Code Duplication
```typescript
// ❌ BEFORE: Duplicated validation logic
class PlaylistService {
  async createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Playlist name is required');
    }
    if (data.name.length > 100) {
      throw new ValidationError('Playlist name too long');
    }
    // Create logic...
  }

  async updatePlaylist(id: string, data: UpdatePlaylistData): Promise<Playlist> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Playlist name is required');
    }
    if (data.name.length > 100) {
      throw new ValidationError('Playlist name too long');
    }
    // Update logic...
  }
}

class TrackService {
  async updateTrack(id: string, data: UpdateTrackData): Promise<Track> {
    if (data.title && data.title.trim().length === 0) {
      throw new ValidationError('Track title cannot be empty');
    }
    if (data.title && data.title.length > 200) {
      throw new ValidationError('Track title too long');
    }
    // Update logic...
  }
}
```

```typescript
// ✅ AFTER: Shared validation utilities
class ValidationUtils {
  static validateRequiredString(value: string, fieldName: string, maxLength?: number): void {
    if (!value || value.trim().length === 0) {
      throw new ValidationError(`${fieldName} is required`);
    }

    if (maxLength && value.length > maxLength) {
      throw new ValidationError(`${fieldName} too long (max ${maxLength} characters)`);
    }
  }

  static validateOptionalString(value: string | undefined, fieldName: string, maxLength?: number): void {
    if (value && value.trim().length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }

    if (value && maxLength && value.length > maxLength) {
      throw new ValidationError(`${fieldName} too long (max ${maxLength} characters)`);
    }
  }

  static validateRating(rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }
  }
}

class PlaylistService {
  async createPlaylist(data: CreatePlaylistData): Promise<Playlist> {
    ValidationUtils.validateRequiredString(data.name, 'Playlist name', 100);
    // Create logic...
  }

  async updatePlaylist(id: string, data: UpdatePlaylistData): Promise<Playlist> {
    ValidationUtils.validateRequiredString(data.name, 'Playlist name', 100);
    // Update logic...
  }
}

class TrackService {
  async updateTrack(id: string, data: UpdateTrackData): Promise<Track> {
    ValidationUtils.validateOptionalString(data.title, 'Track title', 200);
    if (data.rating !== undefined) {
      ValidationUtils.validateRating(data.rating);
    }
    // Update logic...
  }
}
```

### 5. Improve Type Safety
```typescript
// ❌ BEFORE: Weak typing and runtime errors
const updateTrack = async (trackId: any, updates: any) => {
  const track = await trackRepository.findById(trackId);
  if (!track) {
    throw new Error('Track not found');
  }

  // Runtime errors possible here
  const updatedTrack = { ...track, ...updates };
  return await trackRepository.save(updatedTrack);
};
```

```typescript
// ✅ AFTER: Strong typing and compile-time safety
interface UpdateTrackData {
  readonly title?: string;
  readonly artist?: string;
  readonly album?: string;
  readonly genre?: string;
  readonly rating?: number;
}

class TrackUpdateError extends Error {
  constructor(message: string, public readonly trackId: string) {
    super(message);
    this.name = 'TrackUpdateError';
  }
}

const updateTrack = async (
  trackId: string,
  updates: UpdateTrackData
): Promise<Track> => {
  if (!trackId || typeof trackId !== 'string') {
    throw new TrackUpdateError('Invalid track ID', trackId);
  }

  const track = await trackRepository.findById(trackId);
  if (!track) {
    throw new TrackUpdateError('Track not found', trackId);
  }

  // Type-safe updates
  const updatedTrack: Track = {
    ...track,
    ...updates,
    updatedAt: new Date()
  };

  return await trackRepository.save(updatedTrack);
};
```

## Refactoring Process

### 1. Assessment Phase
- **Identify the problem** - What makes the current code difficult to work with?
- **Scope the change** - What files/components are affected?
- **Plan the approach** - What refactoring techniques will help?
- **Ensure test coverage** - Are there tests to verify functionality is preserved?

### 2. Implementation Phase
- **Small incremental changes** - Refactor in small, reviewable chunks
- **Run tests frequently** - Verify nothing breaks after each change
- **Preserve Git history** - Use meaningful commit messages for each step
- **Update documentation** - Keep comments and docs in sync

### 3. Validation Phase
- **All tests pass** - Existing functionality is preserved
- **Performance is maintained** - No significant performance regression
- **Code is cleaner** - Improved readability and maintainability
- **Team review** - Get feedback on the improvements

## Refactoring Checklist

### Before Starting
- [ ] Understand the current functionality completely
- [ ] Identify all dependencies and usage points
- [ ] Ensure comprehensive test coverage exists
- [ ] Plan the refactoring approach step by step

### During Refactoring
- [ ] Make incremental changes
- [ ] Run tests after each significant change
- [ ] Keep commits focused and well-documented
- [ ] Update TypeScript types as needed
- [ ] Maintain API contracts for public interfaces

### After Completion
- [ ] All existing tests pass
- [ ] No new TypeScript errors introduced
- [ ] Code is more readable and maintainable
- [ ] Performance is maintained or improved
- [ ] Documentation is updated where needed

## Common Refactoring Patterns for Harmony

### Extract Audio Processing Logic
```typescript
// From inline audio processing to dedicated service
class AudioAnalysisService {
  async analyzeBPM(filePath: string): Promise<number | null> { }
  async generateWaveform(filePath: string): Promise<number[]> { }
  async detectKey(filePath: string): Promise<string | null> { }
}
```

### Consolidate IPC Handlers
```typescript
// From scattered handlers to organized modules
abstract class BaseIPCModule {
  abstract load(): Promise<void>;
  protected registerHandler<T, R>(channel: string, handler: (data: T) => Promise<R>): void;
}

class TracksIPCModule extends BaseIPCModule {
  async load(): Promise<void> {
    this.registerHandler(channels.TRACK_GET_ALL, this.handleGetAll);
    this.registerHandler(channels.TRACK_UPDATE, this.handleUpdate);
    // ... other handlers
  }
}
```

### Extract Database Repositories
```typescript
// From direct TypeORM usage to repository pattern
interface TrackRepository {
  findById(id: string): Promise<Track | null>;
  findByGenre(genre: string): Promise<Track[]>;
  save(track: Track): Promise<Track>;
  delete(id: string): Promise<void>;
}

class TypeORMTrackRepository implements TrackRepository {
  // Implementation using TypeORM
}
```

Focus on making the code more maintainable, testable, and aligned with Harmony's architecture while preserving all existing functionality.
