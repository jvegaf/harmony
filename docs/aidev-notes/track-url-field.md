# Track URL Field Implementation

**Date**: 2026-02-15  
**Feature**: Track URL field for tag provider links

## Overview

Added a new `url` field to the Track model to store the webpage URL from tag providers (Beatport, Traxsource, Bandcamp). This URL is persisted in MP3 files and allows users to quickly open the track's page in their browser.

## Changes Made

### 1. Data Model (`src/preload/types/harmony.ts`)

Added `url` property to both `Track` and `ResultTag` interfaces:

```typescript
export interface Track {
  // ... other fields
  url?: string; // URL of the track page from the tag provider
}

export interface ResultTag {
  // ... other fields
  url?: Maybe<string>;
}
```

### 2. Database Schema (`src/main/lib/db/schema.ts`)

Added `url` column to the tracks table:

```typescript
export const tracks = sqliteTable('track', {
  // ... other columns
  url: text('url'), // Persisted as WOAR frame (artistUrl in node-id3) / common.website in music-metadata
});
```

Migration file: `drizzle/0003_familiar_skrulls.sql`

```sql
ALTER TABLE `track` ADD `url` text;
```

### 3. Tag Writing (`src/main/lib/track/saver.ts`)

URL is written to MP3 files using the ID3v2 `WOAR` frame (Official artist/performer webpage):

```typescript
const tags = {
  // ... other tags
  artistUrl: url ? [url] : undefined, // WOAR frame in ID3v2.3/v2.4
} as NodeId3.Tags;
```

**Note**: We use `artistUrl` (not `fileUrl`) because `music-metadata` only maps `WOAR` to `common.website`.

### 4. Tag Reading (`src/main/modules/IPCLibraryModule.ts`)

URL is read from MP3 files via `music-metadata`:

```typescript
const metadata = {
  // ... other fields
  url: common.website, // Reads WOAR frame
};
```

### 5. Tag Provider Integration (`src/main/lib/tagger/tagger.ts`)

URLs are extracted from each tag provider:

- **Beatport**: Constructed from slug and ID: `https://www.beatport.com/track/${slug}/${id}`
- **Traxsource**: Already a full URL in API response
- **Bandcamp**: Already a full URL in API response

### 6. Tag Application (`src/main/lib/track/updater.ts`)

When applying tag candidates, URL is merged:

```typescript
const newTrack = {
  // ... other fields
  url: tag.url ?? track.url, // Use tag URL if available, else keep existing
};
```

### 7. Database Operations (`src/main/lib/db/database.ts`)

URL field is included in all database operations:

- `updateTrack()`: Updates `url` field
- `insertTracks()`: Inserts `url` field
- Conflict resolution: Uses `sql\`excluded.url\`` for upserts

### 8. UI (`src/renderer/src/views/Details/Details.tsx`)

Added two UI components:

1. **TextInput field** for manual URL entry:

   ```tsx
   <TextInput
     label='Website / Track URL'
     placeholder='https://...'
     {...form.getInputProps('url')}
   />
   ```

2. **"Open Track Page" button** (conditional):
   ```tsx
   {
     track.url && (
       <Button
         leftSection={<IconExternalLink size={16} />}
         variant='light'
         onClick={() => shell.openExternal(track.url!)}
       >
         Open Track Page
       </Button>
     );
   }
   ```

## Technical Details

### ID3 Frame Mapping

| Library               | Frame | Field            | Type            |
| --------------------- | ----- | ---------------- | --------------- |
| node-id3 (write)      | WOAR  | `artistUrl`      | `Array<string>` |
| music-metadata (read) | WOAR  | `common.website` | `string`        |

**Why WOAR instead of WOAF?**

- `WOAF` (Official audio file webpage) would be semantically more correct
- However, `music-metadata` only maps `WOAR` to `common.website`
- `WOAF` frames are parsed but not exposed in the API

### Array Handling

`node-id3` supports multiple WOAR frames (per ID3 spec). Our implementation:

- Writes a single-element array: `[url]`
- Reads back as a string (first frame only)

### Data Flow

```
User applies tag candidate
  ↓
tagger.ts extracts URL from provider
  ↓
updater.ts merges URL into track
  ↓
saver.ts writes WOAR frame to MP3 file
  ↓
database.ts updates database
  ↓
[User resets library and reimports]
  ↓
IPCLibraryModule.ts reads WOAR frame via music-metadata
  ↓
database.ts inserts track with URL
  ↓
Details.tsx displays URL field and button
```

## Testing

To verify the feature works end-to-end:

1. Apply a tag candidate from Beatport/Traxsource/Bandcamp to a track
2. Open Details view → URL field should be populated
3. Click "Open Track Page" → Browser should open to the correct URL
4. Reset library (Settings → Advanced → Reset Library)
5. Re-import tracks
6. Open Details view → URL field should still be populated
7. Edit URL manually → Should persist to file and database

## Known Limitations

1. **Only first URL preserved**: If multiple WOAR frames exist, only the first is read
2. **Provider-specific**: Only works with tag providers that supply URLs (Beatport, Traxsource, Bandcamp)
3. **Manual import**: URLs from files not tagged via Harmony won't appear unless the file already has a WOAR frame

## Future Enhancements

- [ ] Add URL validation in UI
- [ ] Show provider icon/badge next to URL
- [ ] Support WOAF frame if music-metadata adds support
- [ ] Batch URL extraction from multiple providers

## References

- [ID3v2.3 spec - WOAR frame](https://id3.org/id3v2.3.0#URL_link_frames_-_details)
- [node-id3 documentation](https://github.com/Zazama/node-id3)
- [music-metadata documentation](https://github.com/Borewit/music-metadata)
