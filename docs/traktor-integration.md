# Traktor Integration

Harmony supports bidirectional synchronization with Native Instruments Traktor Pro via its `collection.nml` file.

## Features

- **Import tracks from Traktor** - Sync your Traktor collection to Harmony
- **Automatic file verification** - Only imports tracks whose files exist on disk
- **Metadata sync** - Title, artist, album, genre, BPM, key, comments, rating
- **Cue point sync** - Hot cues, loop points with labels and colors
- **Multiple sync strategies** - Control how conflicts are resolved
- **Backup before write** - Automatic backup when exporting to Traktor
- **Preview before sync** - See what will change before applying

## Setup

1. Open **Settings** → **Traktor** tab
2. Click **Select collection.nml** to choose your Traktor collection file
   - Default locations:
     - **macOS**: `~/Documents/Native Instruments/Traktor <version>/collection.nml`
     - **Windows**: `C:\Users\<user>\Documents\Native Instruments\Traktor <version>\collection.nml`
     - **Linux**: `~/.local/share/Native Instruments/Traktor <version>/collection.nml`
3. The NML info panel will show track count, playlists, and cue points

## Sync Strategies

| Strategy                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| **Smart Merge** (default) | Only fills empty fields in Harmony from Traktor data |
| **Traktor Wins**          | Overwrites Harmony data with Traktor values          |
| **Harmony Wins**          | Keeps Harmony data, ignores Traktor values           |

## Import from Traktor

1. Click **Preview Sync** to see what will be changed
   - Shows matched tracks, tracks to update, and tracks to import
2. Click **Sync from Traktor** to execute the sync
   - New tracks are imported to Harmony
   - Existing tracks are updated based on sync strategy
   - Cue points are synced for all tracks

### What Gets Imported

For **new tracks** (not in Harmony):

- Full metadata from Traktor
- All cue points with labels and colors
- Only imported if the audio file exists on disk

For **existing tracks** (matched by file path):

- Metadata merged according to sync strategy
- Cue points merged (smart merge or replace)

## Export to Traktor

Click **Export to Traktor** to write Harmony changes back to the NML file:

- Updates track metadata in Traktor
- Updates cue points
- Creates automatic backup if enabled

## Technical Details

### File Matching

Tracks are matched by **file path**:

- Case-insensitive on Windows/macOS
- Case-sensitive on Linux
- Traktor path format (`/:Users/:...`) is converted to system paths

### Key Mapping

Musical keys are mapped between formats:

- **Traktor format**: Integer (0-23)
- **Camelot**: 1A-12B
- **Open Key**: 1m-12d

### Cue Point Types

| Traktor Type | Harmony Equivalent |
| ------------ | ------------------ |
| CUE (0)      | Hotcue             |
| FADE-IN (1)  | FadeIn             |
| FADE-OUT (2) | FadeOut            |
| LOAD (3)     | Load               |
| GRID (4)     | Grid               |
| LOOP (5)     | Loop               |

### NML Version Support

Tested with Traktor Pro 3 and Traktor Pro 4 collection files.

## Architecture

```
src/main/lib/traktor/
├── index.ts                    # Public API exports
├── nml-parser.ts              # XML parsing with fast-xml-parser
├── nml-writer.ts              # XML serialization
├── types/nml-types.ts         # TypeScript types for NML structure
├── mappers/
│   ├── key-mapper.ts          # Musical key conversion
│   ├── track-mapper.ts        # Track metadata mapping
│   ├── cue-mapper.ts          # Cue point mapping
│   └── playlist-mapper.ts     # Playlist/folder mapping
└── sync/
    ├── conflict-resolver.ts   # Merge strategies
    └── sync-engine.ts         # Orchestration

src/main/modules/
└── IPCTraktorModule.ts        # IPC handlers for renderer

src/renderer/src/views/Settings/
└── SettingsTraktor.tsx        # UI component
```

## IPC Channels

| Channel                    | Description                       |
| -------------------------- | --------------------------------- |
| `TRAKTOR_GET_CONFIG`       | Get current Traktor configuration |
| `TRAKTOR_SET_CONFIG`       | Update configuration              |
| `TRAKTOR_SELECT_NML_PATH`  | Open file dialog                  |
| `TRAKTOR_PARSE_NML`        | Parse NML and return info         |
| `TRAKTOR_GET_SYNC_PREVIEW` | Preview sync changes              |
| `TRAKTOR_EXECUTE_SYNC`     | Execute sync operation            |
| `TRAKTOR_EXPORT_TO_NML`    | Write to NML file                 |
| `TRAKTOR_SYNC_PROGRESS`    | Progress updates (event)          |

## Tests

202 unit tests covering all mappers, parser, writer, and sync engine:

```bash
yarn test:run src/main/lib/traktor
```
