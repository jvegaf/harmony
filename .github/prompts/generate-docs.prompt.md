---
mode: 'agent'
model: Claude Sonnet 4
tools: ['codebase', 'create', 'edit']
description: 'Generate comprehensive documentation for Harmony codebase'
---

# Generate Documentation for Harmony

You are a technical documentation expert working on Harmony, an Electron-based music manager. Your goal is to create clear, comprehensive documentation that helps developers understand and contribute to the codebase.

## Documentation Types

### 1. Code Documentation
- **JSDoc comments** for functions, classes, and interfaces
- **Inline comments** for complex algorithms and business logic
- **Type annotations** with descriptive comments
- **Example usage** in documentation

### 2. API Documentation
- **Function signatures** with parameter descriptions
- **Return types** and possible errors
- **Usage examples** with realistic scenarios
- **Integration patterns** for IPC and services

### 3. Architecture Documentation
- **System overview** diagrams and explanations
- **Module relationships** and data flow
- **Design patterns** and their usage
- **Configuration** and environment setup

### 4. User/Developer Guides
- **Setup instructions** for development environment
- **Contributing guidelines** for new developers
- **Troubleshooting guides** for common issues
- **Best practices** for the codebase

## Documentation Standards

### JSDoc for Public APIs
```typescript
/**
 * Updates track metadata and persists changes to the database.
 *
 * This function validates the input data, applies updates to the existing track,
 * and saves the changes. It handles both partial updates and complete overwrites
 * based on the provided data.
 *
 * @param trackId - Unique identifier for the track to update
 * @param updates - Partial track object containing fields to update
 * @param options - Additional options for the update operation
 * @param options.validate - Whether to validate the input data (default: true)
 * @param options.overwrite - Whether to overwrite all fields (default: false)
 *
 * @returns Promise that resolves to the updated track
 *
 * @throws {ValidationError} When the update data fails validation
 * @throws {NotFoundError} When the track with the given ID doesn't exist
 * @throws {DatabaseError} When the database operation fails
 *
 * @example
 * ```typescript
 * // Update track title and rating
 * const updatedTrack = await trackService.updateTrack('track-123', {
 *   title: 'New Song Title',
 *   rating: 5
 * });
 *
 * // Overwrite all metadata
 * const replacedTrack = await trackService.updateTrack('track-123', newData, {
 *   overwrite: true
 * });
 * ```
 *
 * @since 1.0.0
 */
export async function updateTrack(
  trackId: string,
  updates: Partial<Track>,
  options: UpdateOptions = {}
): Promise<Track> {
  // Implementation
}
```

### Interface Documentation
```typescript
/**
 * Represents a music track in the Harmony library.
 *
 * Tracks are the core entities that represent individual audio files
 * with their associated metadata. Each track corresponds to a single
 * audio file on the user's system.
 *
 * @interface Track
 */
export interface Track {
  /**
   * Unique identifier for the track.
   * Generated as a UUID when the track is first imported.
   */
  id: string;

  /**
   * Display title of the track.
   * Extracted from file metadata or inferred from filename.
   */
  title: string;

  /**
   * Artist name for the track.
   * May be undefined for tracks without artist metadata.
   */
  artist?: string;

  /**
   * Album name where this track appears.
   * Extracted from file metadata when available.
   */
  album?: string;

  /**
   * Music genre classification.
   * Used for filtering and organization within the library.
   */
  genre?: string;

  /**
   * Absolute path to the audio file on the file system.
   * Must be accessible to the application for playback.
   */
  filePath: string;

  /**
   * Track duration in milliseconds.
   * Calculated during metadata extraction process.
   */
  duration: number;

  /**
   * User-assigned rating from 1-5 stars.
   * Optional field used for track organization and smart playlists.
   *
   * @minimum 1
   * @maximum 5
   */
  rating?: number;

  /**
   * Beats per minute for DJ mixing purposes.
   * Automatically detected during audio analysis.
   */
  bpm?: number;

  /**
   * Musical key of the track (e.g., "C", "Am", "F#").
   * Used for harmonic mixing recommendations.
   */
  key?: string;

  /**
   * Timestamp when the track was added to the library.
   * Set automatically during import process.
   */
  createdAt: Date;

  /**
   * Timestamp of the last metadata update.
   * Updated whenever track information is modified.
   */
  updatedAt: Date;
}
```

## Module Documentation Templates

### Service Class Documentation
```typescript
/**
 * @fileoverview Track management service for Harmony music manager.
 *
 * This module provides the core business logic for managing music tracks
 * including import, metadata extraction, updates, and deletion. It serves
 * as the primary interface between the UI components and the data layer.
 *
 * The service handles:
 * - Track importing from audio files
 * - Metadata extraction and normalization
 * - Database operations with proper error handling
 * - Audio analysis for BPM and key detection
 * - File system operations with validation
 *
 * @author Harmony Development Team
 * @version 1.2.0
 * @since 1.0.0
 */

import { Repository } from 'typeorm';
import { Track, AudioMetadata, ImportOptions } from './types';
import { TrackRepository } from './repositories/TrackRepository';
import { MetadataExtractor } from './services/MetadataExtractor';
import { AudioAnalyzer } from './services/AudioAnalyzer';

/**
 * Service class for managing music tracks in the Harmony library.
 *
 * Provides high-level operations for track management including import,
 * update, deletion, and analysis. Encapsulates business logic and ensures
 * data consistency across operations.
 *
 * @example
 * ```typescript
 * const trackService = new TrackService(repository, metadataExtractor, analyzer);
 *
 * // Import a new track
 * const track = await trackService.importFromFile('/path/to/song.mp3');
 *
 * // Update track metadata
 * const updated = await trackService.updateTrack(track.id, {
 *   rating: 5,
 *   genre: 'Electronic'
 * });
 * ```
 */
export class TrackService {
  constructor(
    private repository: TrackRepository,
    private metadataExtractor: MetadataExtractor,
    private audioAnalyzer: AudioAnalyzer
  ) {}

  /**
   * Imports a track from an audio file with full metadata extraction.
   *
   * This method performs the complete import workflow:
   * 1. Validates the file exists and is a supported format
   * 2. Extracts basic metadata (title, artist, album, etc.)
   * 3. Performs audio analysis (BPM, key detection) if enabled
   * 4. Creates and saves the track record to the database
   *
   * @param filePath - Absolute path to the audio file
   * @param options - Import configuration options
   * @returns Promise resolving to the imported track
   *
   * @throws {FileNotFoundError} When the specified file doesn't exist
   * @throws {UnsupportedFormatError} When the file format isn't supported
   * @throws {CorruptedFileError} When the file is corrupted or unreadable
   * @throws {DatabaseError} When the database save operation fails
   */
  async importFromFile(filePath: string, options: ImportOptions = {}): Promise<Track> {
    // Implementation with detailed inline comments
  }
}
```

### Component Documentation
```typescript
/**
 * @fileoverview TrackList component for displaying music library.
 *
 * This component renders a virtualized list of tracks with support for:
 * - Large libraries (10k+ tracks) with efficient rendering
 * - Multi-select operations for batch actions
 * - Drag and drop for playlist creation
 * - Context menu with track operations
 * - Keyboard navigation and accessibility
 *
 * The component uses react-window for virtualization to maintain
 * performance with large track collections.
 */

interface TrackListProps {
  /** Array of tracks to display in the list */
  tracks: Track[];

  /** Currently selected track IDs for highlighting */
  selectedTrackIds?: string[];

  /** Callback fired when track selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;

  /** Callback fired when a track is double-clicked to play */
  onTrackPlay?: (track: Track) => void;

  /**
   * Height of the list container in pixels.
   * Used for virtualization calculations.
   */
  height: number;

  /**
   * Whether to enable multi-select mode.
   * When true, users can select multiple tracks with Ctrl/Cmd+click.
   * @default false
   */
  multiSelect?: boolean;

  /**
   * Loading state indicator.
   * Shows skeleton rows while tracks are being loaded.
   * @default false
   */
  loading?: boolean;
}

/**
 * Virtualized list component for displaying music tracks.
 *
 * Efficiently renders large collections of tracks using react-window
 * for virtualization. Supports all common list operations including
 * selection, context menus, and keyboard navigation.
 *
 * @example
 * ```tsx
 * <TrackList
 *   tracks={libraryTracks}
 *   height={600}
 *   multiSelect={true}
 *   selectedTrackIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 *   onTrackPlay={playTrack}
 * />
 * ```
 */
export const TrackList = memo<TrackListProps>(({
  tracks,
  selectedTrackIds = [],
  onSelectionChange,
  onTrackPlay,
  height,
  multiSelect = false,
  loading = false
}) => {
  // Implementation with inline documentation
});
```

## Architecture Documentation

### System Overview Template
```markdown
# Harmony Architecture Overview

## System Architecture

Harmony follows Electron's multi-process architecture with three main processes:

### Main Process
- **Responsibility**: Application lifecycle, file system, database operations, IPC coordination
- **Technologies**: Node.js, TypeORM, SQLite, electron-log
- **Key Modules**:
  - `DatabaseModule` - Database connection and migration management
  - `IPCLibraryModule` - Library management IPC handlers
  - `AudioProcessingModule` - Audio analysis and metadata extraction

### Renderer Process
- **Responsibility**: User interface, user interactions, state management
- **Technologies**: React 18, Mantine UI, Zustand, React Router
- **Key Components**:
  - `LibraryView` - Main library interface
  - `PlayerControls` - Audio playback controls
  - `PlaylistManager` - Playlist creation and management

### Preload Process
- **Responsibility**: Secure bridge between main and renderer
- **Technologies**: TypeScript, custom IPC wrapper
- **Key Features**:
  - Type-safe IPC communication
  - Security validation for all messages
  - Shared type definitions

## Data Flow

```
┌─────────────────┐    IPC     ┌─────────────────┐    SQL     ┌─────────────────┐
│   Renderer      │ ---------> │   Main Process  │ ---------> │   Database      │
│   (React UI)    │            │   (Services)    │            │   (SQLite)      │
└─────────────────┘ <--------- └─────────────────┘ <--------- └─────────────────┘
```

### Typical Request Flow
1. User interaction in React component
2. Component calls IPC method via `window.Main.*`
3. Preload script validates and forwards message
4. Main process handler receives typed request
5. Service layer processes business logic
6. Database operation performed via TypeORM
7. Response sent back through IPC chain
8. UI updates with new data

## Module System

### Base Module Pattern
All main process modules extend `BaseModule` or `BaseWindowModule`:

```typescript
export abstract class BaseModule {
  abstract load(): Promise<void>;

  protected async initialize(): Promise<void> {
    // Common initialization logic
  }
}
```

### Module Lifecycle
1. **Registration** - Modules registered in `modules-manager.ts`
2. **Loading** - `load()` method called during app initialization
3. **Cleanup** - Automatic cleanup on app shutdown

## Security Model

### Process Isolation
- Renderer processes run with `contextIsolation: true`
- Node.js integration disabled in renderer
- All Node.js APIs accessed through secure preload bridge

### IPC Security
- All IPC messages validated before processing
- Type checking enforced at runtime
- No direct access to file system or database from renderer

### File System Access
- All file paths validated to prevent directory traversal
- Audio files accessed only through controlled service layer
- User data stored in platform-appropriate directories
```

## API Documentation Template

### IPC API Documentation
```typescript
/**
 * Track Management API
 *
 * Provides methods for managing music tracks in the Harmony library.
 * All methods are accessed through the IPC bridge and return promises.
 *
 * @namespace window.Main.tracks
 */
export interface TrackAPI {
  /**
   * Retrieves all tracks from the library.
   *
   * Returns a complete list of tracks with all metadata. For large libraries
   * (10k+ tracks), consider using pagination or filtering methods instead.
   *
   * @returns Promise<Track[]> Array of all tracks in the library
   *
   * @example
   * ```typescript
   * const allTracks = await window.Main.tracks.getAll();
   * console.log(`Library contains ${allTracks.length} tracks`);
   * ```
   */
  getAll(): Promise<Track[]>;

  /**
   * Finds tracks matching the specified search criteria.
   *
   * Supports partial text matching on title and artist fields, exact matching
   * on genre, and range filtering on rating and BPM. All criteria are combined
   * with AND logic.
   *
   * @param criteria - Search criteria object
   * @param criteria.title - Partial match on track title (case-insensitive)
   * @param criteria.artist - Partial match on artist name (case-insensitive)
   * @param criteria.genre - Exact match on genre
   * @param criteria.rating - Minimum rating (1-5 stars)
   * @param criteria.bpmMin - Minimum BPM value
   * @param criteria.bpmMax - Maximum BPM value
   *
   * @returns Promise<Track[]> Array of tracks matching all criteria
   *
   * @example
   * ```typescript
   * // Find all electronic tracks rated 4+ stars
   * const tracks = await window.Main.tracks.find({
   *   genre: 'Electronic',
   *   rating: 4
   * });
   *
   * // Find tracks for DJ mixing (specific BPM range)
   * const mixTracks = await window.Main.tracks.find({
   *   bpmMin: 128,
   *   bpmMax: 132
   * });
   * ```
   */
  find(criteria: TrackSearchCriteria): Promise<Track[]>;

  /**
   * Updates metadata for an existing track.
   *
   * Accepts partial track data and updates only the provided fields.
   * Automatically updates the `updatedAt` timestamp. Changes are immediately
   * persisted to the database.
   *
   * @param trackId - Unique identifier of the track to update
   * @param updates - Partial track object with fields to update
   *
   * @returns Promise<Track> The updated track with all current data
   *
   * @throws Will reject if track ID is invalid or track doesn't exist
   * @throws Will reject if update data fails validation
   *
   * @example
   * ```typescript
   * // Update track rating and genre
   * const updated = await window.Main.tracks.update('track-123', {
   *   rating: 5,
   *   genre: 'Progressive House'
   * });
   *
   * // Update multiple metadata fields
   * const corrected = await window.Main.tracks.update('track-456', {
   *   title: 'Correct Song Title',
   *   artist: 'Correct Artist',
   *   album: 'Correct Album'
   * });
   * ```
   */
  update(trackId: string, updates: Partial<Track>): Promise<Track>;
}
```

## Troubleshooting Guide Template

```markdown
# Harmony Development Troubleshooting

## Common Issues and Solutions

### Build and Development Issues

#### "Cannot resolve module 'electron'"
**Symptoms**: Build fails with module resolution error
**Cause**: Missing dependencies or corrupted node_modules
**Solution**:
```bash
# Clear dependencies and reinstall
rm -rf node_modules yarn.lock
yarn install

# If issue persists, clear Yarn cache
yarn cache clean
yarn install
```

#### "Python not found" during `yarn install`
**Symptoms**: Native module compilation fails
**Cause**: Missing build tools for native dependencies
**Solution**:
- **Windows**: Install Visual Studio Build Tools or Visual Studio Community
- **macOS**: Install Xcode Command Line Tools: `xcode-select --install`
- **Linux**: Install build-essential: `sudo apt-get install build-essential`

### Runtime Issues

#### Database connection errors
**Symptoms**: App crashes on startup with SQLite errors
**Cause**: Corrupted database file or permission issues
**Solution**:
```bash
# Backup user data first (if any)
cp ~/.config/harmony/database/harmony.db ~/harmony-backup.db

# Reset database (will lose data)
yarn db:reset

# Alternative: Check file permissions
ls -la ~/.config/harmony/database/
# Ensure app has read/write access
```

#### IPC communication timeouts
**Symptoms**: UI freezes or operations never complete
**Cause**: Main process blocking operations or unhandled errors
**Solution**:
1. Check main process logs in DevTools Console
2. Look for synchronous file operations or long-running tasks
3. Ensure all IPC handlers use async/await properly
4. Add timeout handling to IPC calls

### Performance Issues

#### Slow library loading
**Symptoms**: Long delays when opening library view
**Cause**: Large library without proper optimization
**Investigation**:
```typescript
// Add performance monitoring
const startTime = performance.now();
const tracks = await window.Main.tracks.getAll();
const loadTime = performance.now() - startTime;
console.log(`Library loaded in ${loadTime}ms`);
```

**Solutions**:
- Implement pagination for libraries > 5000 tracks
- Add database indexes for frequently queried fields
- Use virtualization for track list rendering
- Consider lazy loading of metadata

#### Memory leaks in renderer
**Symptoms**: App becomes sluggish over time, high memory usage
**Debugging**:
1. Open DevTools Memory tab
2. Take heap snapshots before/after operations
3. Look for detached DOM nodes and unreleased objects

**Common Causes**:
- Missing cleanup in useEffect
- Event listeners not removed
- References kept to large objects
- Unclosed intervals or timeouts

### Audio Issues

#### "File not found" for imported tracks
**Symptoms**: Tracks show in library but won't play
**Cause**: Files moved or deleted after import
**Solution**:
```typescript
// Check file accessibility
const exists = await window.Main.files.exists(track.filePath);
if (!exists) {
  // Prompt user to relocate file
  const newPath = await window.Main.dialogs.showOpenDialog({
    title: 'Locate moved file',
    defaultPath: path.dirname(track.filePath)
  });

  if (newPath) {
    await window.Main.tracks.update(track.id, { filePath: newPath });
  }
}
```

#### Audio format not supported
**Symptoms**: Import fails for certain file types
**Supported Formats**: MP3, FLAC, WAV, M4A, OGG
**Solution**: Convert unsupported files or add format support

## Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Start app in debug mode
yarn dev --debug

# Or set environment variable
DEBUG=harmony:* yarn dev
```

This enables verbose logging in main process and additional DevTools panels.
```

## Documentation Generation Process

### 1. Audit Current Documentation
- Review existing comments and documentation
- Identify gaps in API documentation
- Check for outdated information
- List areas needing better examples

### 2. Plan Documentation Structure
- Organize by module/component responsibility
- Create template for each documentation type
- Define consistent formatting standards
- Plan integration with existing docs

### 3. Generate Content
- Write comprehensive JSDoc for all public APIs
- Create architecture diagrams and explanations
- Develop usage examples and tutorials
- Build troubleshooting guides

### 4. Review and Validate
- Ensure technical accuracy
- Test all code examples
- Verify links and references
- Get team feedback on clarity

Ask for clarification on any specific areas that need documentation focus, and I'll generate comprehensive, accurate documentation following these templates and standards.
