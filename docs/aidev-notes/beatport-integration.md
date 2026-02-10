# Beatport Integration - Developer Notes

## Overview

This document consolidates all AIDEV notes related to the Beatport integration for tag searching and metadata retrieval.

---

## API Response Handling

### Genre Field Variations

**Location:** `src/main/lib/tagger/beatport/client/client.ts:349`

**Context:** When parsing search results from HTML scraping

**Note:**

```typescript
// AIDEV-NOTE: En scraping, genre puede venir como array o como objeto
// Intentamos primero como array, luego como objeto simple
```

**Details:**

- The `genre` field in scraped Beatport data can come in two formats:
  - As an array: `track.genre[0]` contains the genre object
  - As a single object: `track.genre` is the genre object directly
- The parsing logic tries array access first, then falls back to direct object access
- Similar pattern applies to `sub_genre` field

**Related Code:**

```typescript
genre: track.genre?.[0]
  ? {
      genre_id: track.genre[0].genre_id,
      id: track.genre[0].genre_id,
      genre_name: track.genre[0].genre_name,
      name: track.genre[0].genre_name,
      slug: track.genre[0].slug,
    }
  : Array.isArray(track.genre)
    ? undefined
    : track.genre
      ? {
          genre_id: track.genre.genre_id,
          id: track.genre.genre_id,
          genre_name: track.genre.genre_name,
          name: track.genre.genre_name,
          slug: track.genre.slug,
        }
      : undefined;
```

---

### API v4 Genre Field Structure

**Location:** `src/main/lib/tagger/beatport/client/client.ts:526`

**Context:** When parsing track details from Beatport API v4

**Note:**

```typescript
// AIDEV-NOTE: La API v4 devuelve 'genre' (singular) directamente, no 'genres' (plural)
// Intentamos primero data.genre, luego data.genres[0] como fallback
```

**Details:**

- API v4 returns `genre` as a singular field, not `genres` (plural)
- Parsing logic tries `data.genre` first
- Falls back to `data.genres[0]` for backward compatibility
- Same pattern applies to `sub_genre` vs `sub_genres`

**Related Code:**

```typescript
genre: data.genre
  ? {
      genre_id: data.genre.id,
      id: data.genre.id,
      genre_name: data.genre.name,
      name: data.genre.name,
      slug: data.genre.slug,
    }
  : data.genres?.[0]
    ? {
        genre_id: data.genres[0].id,
        id: data.genres[0].id,
        genre_name: data.genres[0].name,
        name: data.genres[0].name,
        slug: data.genres[0].slug,
      }
    : undefined;
```

---

**Location:** `src/main/lib/tagger/beatport/client/client.ts:545`

**Note:**

```typescript
// AIDEV-NOTE: sub_genre también puede venir como 'sub_genre' singular
```

**Details:**

- `sub_genre` field follows the same singular/plural pattern as `genre`
- Always check both `data.sub_genre` and `data.sub_genres[0]`

---

## Tag Mapping

### Optional Genre Field

**Location:** `src/main/lib/tagger/bp/bpTagMapper.ts:4`

**Note:**

```typescript
// AIDEV-NOTE: Interface actualizada para manejar respuestas de Beatport API v4
// genre puede ser opcional si la API no lo incluye
```

**Details:**

- The `Result` interface has been updated to make `genre` optional
- This handles cases where Beatport API v4 doesn't include genre information
- Interface definition:

```typescript
interface Result {
  mix_name: string;
  name: string;
  artists?: [{ name: string }];
  id: string;
  key: { camelot_number: string; camelot_letter: string };
  release: { name: string; image: { uri: string } };
  publish_date: string;
  genre?: { name: string }; // Optional field
  bpm: number;
  length_ms: number;
}
```

---

**Location:** `src/main/lib/tagger/bp/bpTagMapper.ts:30`

**Note:**

```typescript
// AIDEV-NOTE: Si genre no está presente, usamos undefined para que el campo sea opcional
```

**Details:**

- When creating `ResultTag` objects, genre is set to `undefined` if not present
- Uses optional chaining: `genre: result.genre?.name`
- This ensures the field is truly optional and won't cause errors if missing

---

## API Configuration

### Facets Parameter

**Location:** `src/main/lib/tagger/bp/beatport.ts:10`

**Note:**

```typescript
// AIDEV-NOTE: facets=genre,fieldType asegura que la API incluya genre y sub_genre en la respuesta
```

**Details:**

- The `facets=genre,fieldType` parameter ensures the API includes genre and sub_genre in responses
- Base URI: `https://api.beatport.com/v4/catalog/search/?facets=genre,fieldType&q=`
- Without this parameter, genre information might be missing from search results

---

## Image/Artwork Field Handling

### API v4 Image Object Structure

**Location:** `src/main/lib/tagger/beatport/client/client.ts:577-613`

**Context:** When parsing track details from Beatport API v4

**Note:**

```typescript
// AIDEV-NOTE: API v4 returns image with 'uri' and 'dynamic_uri' fields, not 'url'
```

**Details:**

- The Beatport API v4 returns image objects with the structure: `{ id: number, uri: string, dynamic_uri: string }`
- **Field names are `uri` and `dynamic_uri`**, NOT `url`
- This applies to both `data.image` (track-level image) and `data.release.image` (release-level image)
- The `uri` field contains the full-resolution static image URL
- The `dynamic_uri` field contains a URL with `{w}` and `{h}` placeholders for dynamic resizing

**Image Object Interface:**

```typescript
interface BeatportImage {
  id: number;
  uri: string; // Full-resolution static image URL
  dynamic_uri: string; // URL with {w} and {h} placeholders
}
```

**Related Code:**

```typescript
// Release-level image from API v4
image: data.release.image
  ? {
      id: data.release.image.id,
      uri: data.release.image.uri,              // Correct field name
      dynamic_uri: data.release.image.dynamic_uri, // Correct field name
    }
  : undefined,

// Track-level image from API v4
image: data.image
  ? {
      id: data.image.id,
      uri: data.image.uri,              // Correct field name
      dynamic_uri: data.image.dynamic_uri, // Correct field name
    }
  : undefined,
```

**Dynamic URI Usage:**

```typescript
// Example dynamic_uri format:
// "https://geo-media.beatport.com/image_size/{w}x{h}/abc123.jpg"

// To get a 500x500 image:
const artworkUrl = dynamic_uri.replace('{w}', '500').replace('{h}', '500');
// Result: "https://geo-media.beatport.com/image_size/500x500/abc123.jpg"
```

**Important:**

- Max supported size appears to be **1400×1400** pixels
- The `BeatportImageUtils.getUrl()` helper handles the `{w}` and `{h}` replacement automatically
- Fallback string fields (`release_image_uri`, `image_uri`, etc.) should map from `data.release.image?.uri` and `data.release.image?.dynamic_uri`

**Historical Bug:** Prior to 2026-02-10, the parser incorrectly read `data.release.image.url` and `data.image.url`, which don't exist in the API v4 response. This caused all Beatport artwork URLs to be `undefined`. The bug was fixed by using the correct field names `uri` and `dynamic_uri`.

---

## Summary

### Key Takeaways

1. **Genre Field Handling**: Always expect `genre` and `sub_genre` to potentially come in multiple formats:

   - Array format (scraping): `track.genre[0]`
   - Object format (scraping): `track.genre`
   - Singular format (API v4): `data.genre`
   - Plural format (API v4 fallback): `data.genres[0]`

2. **Image Field Handling**: The Beatport API v4 uses `uri` and `dynamic_uri` field names for image objects, NOT `url`:

   - Always read `data.release.image.uri` and `data.release.image.dynamic_uri`
   - Always read `data.image.uri` and `data.image.dynamic_uri`
   - Use `BeatportImageUtils.getUrl()` to handle `{w}` and `{h}` placeholder replacement
   - Max image size: 1400×1400 pixels

3. **Optional Fields**: Genre is optional throughout the codebase - all related code should use optional chaining

4. **API Configuration**: Always include `facets=genre,fieldType` in API requests to ensure genre data is returned

5. **Consistency**: Both scraping and API v4 parsing follow similar patterns for handling field variations

---

## Related Files

- `src/main/lib/tagger/beatport/client/client.ts` - Beatport HTTP client
- `src/main/lib/tagger/bp/bpTagMapper.ts` - Tag result mapper
- `src/main/lib/tagger/bp/beatport.ts` - Beatport API wrapper
- `src/preload/types/beatport.ts` - TypeScript type definitions

---

**Last Updated:** 2026-02-10
