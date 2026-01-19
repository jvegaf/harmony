# Audio Analysis Worker Pool - Usage Guide

## Overview

The Audio Analysis Worker Pool enables **parallel analysis of multiple tracks** using real Node.js worker threads. This prevents UI blocking during CPU-intensive audio analysis while providing real-time updates as each track completes.

## Features

- ✅ **Real Worker Threads** - Analysis runs in separate Node.js threads, never blocking the UI
- ✅ **Parallel Processing** - Multiple workers analyze files simultaneously
- ✅ **Configurable Pool Size** - User can set 1-16 workers (default: CPU cores - 1)
- ✅ **Progress Reporting** - Real-time progress events during batch analysis
- ✅ **Real-time Track Updates** - TrackList updates immediately as each track completes
- ✅ **Queue Management** - Automatic task distribution and load balancing
- ✅ **Error Handling** - Graceful degradation, partial results on errors

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer (UI)                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1. Fire-and-forget: analyzeBatch()                   │ │
│  │  2. Listen to AUDIO_ANALYSIS_PROGRESS                 │ │
│  │  3. Listen to AUDIO_ANALYSIS_TRACK_COMPLETE           │ │
│  │  4. Update TrackList rows in real-time                │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────┬─────────────────────────▲────────────────────┘
               │ IPC                     │ IPC Events
               │                         │
┌──────────────▼─────────────────────────┴────────────────────┐
│                    Main Process                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  IPCAudioAnalysisModule                               │ │
│  │  - Receives IPC requests                              │ │
│  │  - Saves results to database                          │ │
│  │  - Emits AUDIO_ANALYSIS_TRACK_COMPLETE per track      │ │
│  └───────────────────────────────────────────────────────┘ │
│                         │                                   │
│  ┌──────────────────────▼────────────────────────────────┐ │
│  │  AudioAnalysisWorkerPool                              │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │              Task Queue                         │  │ │
│  │  │  [ Task1, Task2, Task3, Task4, ... ]            │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                         │                              │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │ │
│  │  │  W1  │ │  W2  │ │  W3  │ │  W4  │ │  W5  │  ...   │ │
│  │  │Thread│ │Thread│ │Thread│ │Thread│ │Thread│        │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Worker Thread Architecture

Each worker thread (`analysis-worker.ts`):

- Runs in a **separate V8 isolate** with its own memory
- Has its own **essentia.js WASM instance**
- Communicates with main thread via **message passing**
- Processes one file at a time, returns result when done

This ensures:

1. **UI never blocks** - Main process event loop stays free
2. **True parallelism** - Multiple CPU cores utilized
3. **Memory isolation** - Worker crashes don't affect main process

---

## Data Flow

```
1. User: Select tracks → Right-click → "Analyze Audio"

2. IPCMenuEvents.tsx (Renderer):
   - Show notification with loading spinner
   - Call analyzeBatch() WITHOUT await (fire-and-forget)
   - Register listeners for progress and track complete

3. IPCAudioAnalysisModule.ts (Main Process):
   - Receive IPC request
   - Delegate to WorkerPool.analyzeFiles()

4. worker-pool.ts (Main Process):
   - Initialize worker threads if needed
   - Distribute tasks to available workers
   - Collect results as workers complete

5. analysis-worker.ts (Worker Thread):
   - Decode audio file (ffmpeg for non-WAV)
   - Run BPM detection (RhythmExtractor2013)
   - Run Key detection (KeyExtractor)
   - Generate waveform peaks (RMS-based)
   - Send result back to main thread

6. IPCAudioAnalysisModule.ts (Main Process):
   - Receive result from worker
   - Save to database (updateTrack)
   - Emit AUDIO_ANALYSIS_TRACK_COMPLETE with updated track

7. preload/index.ts:
   - Forward event to renderer

8. IPCMenuEvents.tsx (Renderer):
   - Receive track complete event
   - Update useLibraryStore.updated state

9. TrackList.tsx (Renderer):
   - React to updated !== lastUpdated
   - Call updateTrackRow() to refresh AG Grid row

10. User sees BPM/Key appear in real-time!
```

---

## Usage Examples

### 1. Single Track Analysis

```typescript
// From renderer
const result = await window.Main.audioAnalysis.analyze('/path/to/track.mp3', {
  detectBpm: true,
  detectKey: true,
  generateWaveform: true,
  waveformBins: 300,
});

console.log(result.bpm); // 128
console.log(result.key); // "Am"
console.log(result.waveformPeaks); // [0.1, 0.5, 0.8, ...]
```

### 2. Batch Analysis (Current Implementation)

The context menu "Analyze Audio" already implements this:

```typescript
// In IPCMenuEvents.tsx
function analyzeAudio(selected: Track[]) {
  const notificationId = `audio-analysis-${Date.now()}`;

  // Show loading notification
  notifications.show({
    id: notificationId,
    title: 'Audio Analysis',
    message: `Analyzing ${selected.length} track(s)...`,
    loading: true,
    autoClose: false,
  });

  // Listen for progress updates
  const unsubscribeProgress = window.Main.audioAnalysis.onProgress(progress => {
    notifications.update({
      id: notificationId,
      message: `Analyzing... ${progress.completed}/${progress.total} (${progress.percentage}%)`,
      loading: true,
    });
  });

  // Listen for individual track completions (real-time UI updates)
  const unsubscribeTrackComplete = window.Main.audioAnalysis.onTrackComplete(track => {
    useLibraryStore.setState({ updated: track });
  });

  // Fire-and-forget - don't await!
  const filePaths = selected.map(track => track.path);

  window.Main.audioAnalysis
    .analyzeBatch(filePaths)
    .then(() => {
      unsubscribeProgress();
      unsubscribeTrackComplete();
      notifications.update({
        id: notificationId,
        title: 'Audio Analysis Complete',
        message: `Successfully analyzed ${selected.length} track(s)`,
        loading: false,
        color: 'green',
      });
    })
    .catch(error => {
      unsubscribeProgress();
      unsubscribeTrackComplete();
      notifications.update({
        id: notificationId,
        title: 'Audio Analysis Failed',
        message: String(error),
        color: 'red',
      });
    });
}
```

---

## Performance Considerations

### Pool Size Recommendations

| Use Case                    | Recommended Pool Size | Reasoning                       |
| --------------------------- | --------------------- | ------------------------------- |
| **Single track**            | 1 worker              | No need for parallelism         |
| **Small playlist (<20)**    | 2-4 workers           | Fast enough, low resource usage |
| **Large playlist (20-100)** | 4-6 workers           | Good balance                    |
| **Library analysis (100+)** | CPU cores - 1         | Max speed, leave 1 core for UI  |

### Resource Usage

- **Memory**: ~50-100MB per worker (essentia.js WASM + audio buffers)
- **CPU**: 100% per worker during analysis (but in separate threads!)
- **Disk I/O**: Reading audio files, ffmpeg conversion for non-WAV

### Why Worker Threads Matter

**Before (blocking):**

```
Main Thread: [===ANALYSIS===][===ANALYSIS===][===ANALYSIS===]
UI:          [    FROZEN    ][    FROZEN    ][    FROZEN    ]
```

**After (non-blocking):**

```
Main Thread: [--free--][--free--][--free--][--free--]
Worker 1:    [===ANALYSIS===]
Worker 2:    [===ANALYSIS===]
Worker 3:              [===ANALYSIS===]
UI:          [responsive][responsive][responsive]
```

---

## Configuration

### Settings UI (SettingsAudio.tsx)

```typescript
<NumberInput
  label="Audio Analysis Workers"
  description="Number of parallel workers for BPM/Key detection"
  min={1}
  max={16}
  value={audioAnalysisWorkers}
  onChange={(value) => config.set('audioAnalysisWorkers', value)}
/>
```

### Config Interface

```typescript
interface Config {
  // ... existing config
  audioAnalysisWorkers: number; // Default: CPU cores - 1, max 8
}
```

---

## IPC Channels

| Channel                         | Direction       | Purpose                                       |
| ------------------------------- | --------------- | --------------------------------------------- |
| `AUDIO_ANALYZE`                 | Renderer → Main | Analyze single file                           |
| `AUDIO_ANALYZE_BATCH`           | Renderer → Main | Analyze multiple files                        |
| `AUDIO_ANALYSIS_PROGRESS`       | Main → Renderer | Progress updates during batch                 |
| `AUDIO_ANALYSIS_TRACK_COMPLETE` | Main → Renderer | Individual track completed (for real-time UI) |

---

## Files Structure

```
src/main/lib/audio-analysis/
├── index.ts                 # Public exports
├── types.ts                 # TypeScript interfaces
├── analyzer.ts              # Core analysis logic (used by worker)
├── audio-decoder.ts         # Audio decoding (WAV, ffmpeg)
├── analysis-worker.ts       # Worker thread entry point
└── worker-pool.ts           # Worker thread pool manager
```

---

## Testing

```bash
# Start development mode
yarn dev

# In app:
# 1. Select 5-10 tracks in TrackList
# 2. Right-click → "Analyze Audio"
# 3. Verify:
#    - UI remains responsive (can scroll, navigate)
#    - Notification shows progress percentage
#    - BPM/Key columns update as each track completes
#    - Final notification shows success

# Monitor worker activity in terminal:
# Look for:
# [AudioWorkerPool] Initializing 7 worker threads...
# [AudioWorkerPool] Worker 0 ready
# [AudioWorker] Analyzing: /path/to/track.mp3
# [AudioWorker] Decoded: 300.00s, 44100Hz
```

---

## Error Handling

```typescript
// Errors are collected per-file, successful results still returned
const result = await window.Main.audioAnalysis.analyzeBatch(filePaths);

// result.results: Map<filePath, AudioAnalysisResult>
// result.errors: Map<filePath, errorMessage>

if (Object.keys(result.errors).length > 0) {
  console.error('Some files failed:', result.errors);
}
```

---

## Future Enhancements

- [ ] Cancel button to abort running analysis
- [ ] Persistent queue (survive app restarts)
- [ ] Priority queue (user-selected tracks first)
- [ ] Background analysis (analyze library on idle)
- [ ] Skip already-analyzed files (check if BPM/Key exists)
- [ ] Waveform preview in analysis progress
