# Traxsource Tagger

## Implementation Notes

### Search Functionality

- Uses `/search` endpoint instead of `/search/tracks`
- URL must be built manually with query parameters to avoid double-encoding issues with axios
- Parses track data from `#searchTrackList` element with `.trk-row` items

### Data Parsing

- Key/BPM format: "G#min\n129" (newline separated)
- Duration format: "(5:57)" parsed to seconds
- Artists are comma-separated in HTML

### HTTP Client

- Requires modern browser-like headers to avoid bot detection
- Referer header should point to base URL

## Recent Fixes

- Fixed search URL construction to avoid double-encoding
- Fixed key parsing to preserve "min" instead of converting to "m"
- Updated HTTP headers for better compatibility
- Fixed version parsing to extract only the version name without duration

## Testing

```sh
npx tsx src/main/lib/tagger/traxsource/test.ts

```
