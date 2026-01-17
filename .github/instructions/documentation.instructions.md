---
applyTo: "**/*.md,**/*.ts,**/*.tsx,**/*.js"
description: "Documentation standards and best practices for Harmony project"
---

# Documentation Standards for Harmony

## Core Documentation Principles

### Clarity and Accessibility
- **Write for your future self** - assume you'll forget the context in 6 months
- **Write for new contributors** - documentation should help onboarding
- **Keep it up-to-date** - outdated docs are worse than no docs
- **Use clear, simple language** - avoid jargon and complex explanations

### Documentation Types
- **Code Documentation** - JSDoc comments, inline comments explaining complex logic
- **API Documentation** - Function signatures, parameters, return types, examples
- **Architecture Documentation** - High-level system design, data flow, patterns
- **User Documentation** - README files, setup guides, usage examples

## Code Documentation Standards

### JSDoc for Public APIs
```typescript
/**
 * Updates track metadata and saves changes to the database
 *
 * @param trackId - Unique identifier for the track
 * @param updates - Partial track object containing fields to update
 * @returns Promise resolving to the updated track
 *
 * @throws {ValidationError} When update data fails validation
 * @throws {NotFoundError} When track with given ID doesn't exist
 *
 * @example
 * ```typescript
 * const updatedTrack = await trackService.updateTrack('track-123', {
 *   title: 'New Title',
 *   rating: 5
 * });
 * ```
 */
export async function updateTrack(
  trackId: string,
  updates: Partial<Track>
): Promise<Track> {
  // Implementation
}
```

### Interface Documentation
```typescript
/**
 * Represents a music track in the Harmony library
 */
export interface Track {
  /** Unique identifier for the track */
  id: string;

  /** Track title as displayed to the user */
  title: string;

  /** Artist name, optional for unknown artists */
  artist?: string;

  /** Album name, extracted from metadata */
  album?: string;

  /** Music genre classification */
  genre?: string;

  /** Absolute path to the audio file */
  filePath: string;

  /** Track duration in milliseconds */
  duration: number;

  /** User rating from 1-5, optional */
  rating?: number;

  /** Timestamp when track was added to library */
  createdAt: Date;

  /** Timestamp of last metadata update */
  updatedAt: Date;
}
```

### Complex Algorithm Documentation
```typescript
/**
 * Analyzes audio waveform to detect BPM (Beats Per Minute)
 *
 * Uses a combination of onset detection and autocorrelation to identify
 * rhythmic patterns in the audio signal. The algorithm:
 *
 * 1. Applies a high-pass filter to emphasize transients
 * 2. Computes spectral flux to detect onset times
 * 3. Uses autocorrelation to find repeating patterns
 * 4. Applies median filtering to reduce noise in BPM detection
 *
 * @param audioBuffer - Raw audio data for analysis
 * @param sampleRate - Audio sample rate in Hz
 * @returns Detected BPM value, or null if detection fails
 */
function detectBPM(audioBuffer: Float32Array, sampleRate: number): number | null {
  // Step 1: Apply high-pass filter to emphasize transients
  const filtered = applyHighPassFilter(audioBuffer, 100, sampleRate);

  // Step 2: Compute spectral flux for onset detection
  const onsets = detectOnsets(filtered, sampleRate);

  // Step 3: Use autocorrelation to find repeating patterns
  const intervals = computeOnsetIntervals(onsets);
  const autocorr = autocorrelation(intervals);

  // Step 4: Find dominant period and convert to BPM
  const dominantPeriod = findDominantPeriod(autocorr);
  return dominantPeriod ? 60000 / dominantPeriod : null;
}
```

### Inline Comments for Complex Logic
```typescript
export class PlaylistManager {
  private shuffleTrackOrder(tracks: Track[]): Track[] {
    // Fisher-Yates shuffle algorithm for unbiased randomization
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate random index from 0 to i (inclusive)
      const j = Math.floor(Math.random() * (i + 1));

      // Swap elements at indices i and j
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateCrossfadeDuration(fromTrack: Track, toTrack: Track): number {
    // Use tempo difference to determine optimal crossfade length
    // Larger tempo differences need shorter crossfades to avoid dissonance
    const tempoDifference = Math.abs(fromTrack.bpm - toTrack.bpm);

    if (tempoDifference > 20) {
      return 2000; // 2 seconds for very different tempos
    } else if (tempoDifference > 10) {
      return 4000; // 4 seconds for moderate differences
    } else {
      return 6000; // 6 seconds for similar tempos
    }
  }
}
```

## Architecture Documentation

### Module Documentation
```typescript
/**
 * @fileoverview Audio Processing Module
 *
 * This module handles all audio-related operations including:
 * - File format detection and validation
 * - Metadata extraction from audio files
 * - Audio analysis (BPM, key detection, waveform generation)
 * - Audio format conversion and optimization
 *
 * The module follows a plugin architecture where different audio
 * formats are handled by specialized processors that implement
 * the AudioProcessor interface.
 *
 * @author Harmony Team
 * @version 1.0.0
 */

import { AudioProcessor, AudioMetadata, ProcessingOptions } from './types';
```

### Design Patterns Documentation
```typescript
/**
 * IPC Module System for Harmony
 *
 * This module implements the Module pattern for organizing IPC handlers.
 * Each functional area (tracks, playlists, settings) has its own module
 * that extends BaseIPCModule.
 *
 * Benefits:
 * - Clear separation of concerns
 * - Consistent error handling across all IPC channels
 * - Automatic handler registration and cleanup
 * - Type-safe IPC communication with shared interfaces
 *
 * Pattern Implementation:
 * 1. Each module extends BaseIPCModule
 * 2. Handlers are registered in the load() method
 * 3. All handlers return standardized response objects
 * 4. Error handling is centralized in the base class
 *
 * @example
 * ```typescript
 * export class TracksIPCModule extends BaseIPCModule {
 *   async load(): Promise<void> {
 *     this.registerHandler(channels.TRACK_UPDATE, this.handleTrackUpdate);
 *   }
 * }
 * ```
 */
export abstract class BaseIPCModule {
  // Implementation
}
```

## README and User Documentation

### Project README Structure
```markdown
# Harmony

A modern music manager for old-school DJs, built with Electron, React, and TypeScript.

## Features

- **Library Management** - Import, organize, and tag your music collection
- **DJ Tools** - BPM detection, key analysis, and seamless crossfading
- **Playlist Creation** - Smart playlists with automatic recommendations
- **Metadata Editing** - Comprehensive tag editing with batch operations
- **Format Support** - MP3, FLAC, WAV, M4A, and more

## Quick Start

### Prerequisites
- Node.js 18+ and Yarn package manager
- At least 4GB RAM for large libraries
- 1GB free disk space for app and cache

### Installation
```bash
git clone https://github.com/harmony-team/harmony.git
cd harmony
yarn install
```

### Development
```bash
yarn dev          # Start development mode
yarn build        # Build for production
yarn test         # Run test suite
yarn lint         # Check code style
```

## Architecture

Harmony uses Electron's multi-process architecture:

- **Main Process** - Database, file system, and IPC coordination
- **Renderer Process** - React UI and user interactions
- **Preload Scripts** - Secure bridge between main and renderer

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.
```

### API Documentation Example
```typescript
/**
 * Track Management API
 *
 * The Track API provides methods for managing music tracks in the Harmony library.
 * All methods return promises and should be called from the renderer process via IPC.
 */

export interface TrackAPI {
  /**
   * Retrieves all tracks from the library
   *
   * @returns Promise<Track[]> - Array of all tracks
   *
   * @example
   * ```typescript
   * const tracks = await window.Main.tracks.getAll();
   * console.log(`Found ${tracks.length} tracks`);
   * ```
   */
  getAll(): Promise<Track[]>;

  /**
   * Finds tracks matching the specified criteria
   *
   * @param criteria - Search criteria object
   * @param criteria.title - Partial match on track title
   * @param criteria.artist - Partial match on artist name
   * @param criteria.genre - Exact match on genre
   * @param criteria.rating - Minimum rating (1-5)
   *
   * @returns Promise<Track[]> - Array of matching tracks
   *
   * @example
   * ```typescript
   * // Find all rock tracks rated 4 or higher
   * const rockTracks = await window.Main.tracks.find({
   *   genre: 'Rock',
   *   rating: 4
   * });
   * ```
   */
  find(criteria: TrackSearchCriteria): Promise<Track[]>;
}
```

## Setup and Configuration Documentation

### Environment Setup
```markdown
## Development Environment Setup

### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- **Node.js**: Version 18 or higher
- **Memory**: 8GB RAM recommended for large music libraries
- **Storage**: SSD recommended for better performance

### Editor Configuration

#### VS Code (Recommended)
Install these extensions:
- ESLint - Code linting
- Prettier - Code formatting
- TypeScript Importer - Auto imports
- Thunder Client - API testing

#### Settings
Add to your VS Code `settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Database Setup
Harmony uses SQLite for local storage. No additional database setup required.

#### Development Database
```bash
yarn dev:db:reset    # Reset development database
yarn dev:db:seed     # Add sample data for testing
yarn dev:db:migrate  # Run pending migrations
```
```

### Troubleshooting Documentation
```markdown
## Common Issues

### Build Problems

#### Error: "Cannot resolve module 'electron'"
**Cause**: Missing dependencies or corrupted node_modules
**Solution**:
```bash
rm -rf node_modules yarn.lock
yarn install
```

#### Error: "Python not found"
**Cause**: Native modules require Python for building
**Solution**:
- Windows: Install Visual Studio Build Tools
- macOS: Install Xcode Command Line Tools
- Linux: `sudo apt-get install build-essential`

### Runtime Issues

#### App won't start after build
**Cause**: Missing native dependencies in production build
**Solution**: Check that all native modules are included in package.json

#### Database errors on startup
**Cause**: Corrupted database file or migration issues
**Solution**:
```bash
# Backup user data first
yarn db:reset
# Re-import library if needed
```

### Performance Issues

#### Slow library loading
**Cause**: Large library without proper indexing
**Solution**:
1. Check database indexes are present
2. Consider library pagination for 10k+ tracks
3. Monitor memory usage during import

#### UI freezing during file operations
**Cause**: Blocking operations on main thread
**Solution**: Ensure file operations use async/await patterns
```

## Documentation Maintenance

### Keeping Documentation Current
```typescript
/**
 * Documentation Review Checklist
 *
 * Run this checklist monthly or when making significant changes:
 *
 * 1. Review all public API documentation for accuracy
 * 2. Update examples to match current API signatures
 * 3. Check that code comments reflect actual implementation
 * 4. Validate all links in markdown files
 * 5. Update version numbers and compatibility info
 * 6. Review setup instructions on a fresh system
 */

// Use TypeScript to catch documentation drift
interface DocumentationMetadata {
  /** Last review date in ISO format */
  lastReviewed: string;
  /** Person responsible for this documentation */
  maintainer: string;
  /** Related code files that might affect this doc */
  dependencies: string[];
}
```

### Documentation Automation
```typescript
/**
 * Automated documentation generation for API endpoints
 *
 * This function generates markdown documentation from TypeScript interfaces
 * and JSDoc comments. Run as part of the build process to keep docs current.
 */
export function generateAPIDocs(sourceFiles: string[]): void {
  // Parse TypeScript files for interfaces and JSDoc
  const apiInfo = parseAPIFromSource(sourceFiles);

  // Generate markdown documentation
  const markdown = generateMarkdownFromAPI(apiInfo);

  // Write to docs directory
  fs.writeFileSync('./docs/API.md', markdown);
}
```

## Documentation Best Practices

### DO's
- **Write documentation as you code** - don't defer it
- **Use consistent formatting** - follow established patterns
- **Include practical examples** - show real usage scenarios
- **Link related concepts** - help users discover relevant info
- **Update docs with code changes** - keep them in sync
- **Write for different skill levels** - beginners to experts

### DON'Ts
- **Don't document obvious code** - `// increment i` is useless
- **Don't use complex jargon** - explain technical terms
- **Don't let docs become outdated** - worse than no docs
- **Don't duplicate information** - maintain single source of truth
- **Don't write novels** - be concise and focused
- **Don't assume context** - provide necessary background

### Documentation Review Process
```markdown
## Documentation Review Checklist

Before merging any PR with documentation changes:

- [ ] All code changes have corresponding doc updates
- [ ] New APIs have complete JSDoc documentation
- [ ] Examples are tested and working
- [ ] Links to external resources are valid
- [ ] Grammar and spelling are correct
- [ ] Technical accuracy verified by code review
- [ ] Accessibility considerations documented where relevant
```
