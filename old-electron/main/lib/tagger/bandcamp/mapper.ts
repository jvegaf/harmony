/**
 * Bandcamp Mapper
 *
 * AIDEV-NOTE: Maps Bandcamp search results to RawTrackData for the provider system.
 * Key points:
 * - Bandcamp does NOT provide BPM or Key, these fields will be undefined
 * - The ID is the full track URL
 * - Duration may not be available from search results (only from full track info)
 */

import { RawTrackData } from '../providers/types';
import { BandcampSearchResult, BandcampTrackInfo } from './client';

/**
 * Map a Bandcamp search result to RawTrackData
 *
 * @param result - Bandcamp search result
 * @returns RawTrackData for the provider system
 */
export function mapSearchResultToRawTrackData(result: BandcampSearchResult): RawTrackData {
  return {
    // Use full URL as ID (will be prefixed with 'bandcamp:' by TrackCandidateUtils)
    id: result.url,
    title: result.name,
    artists: result.artist ? [result.artist] : [],
    // Bandcamp doesn't provide these from search
    bpm: undefined,
    key: undefined,
    duration_secs: undefined,
    artwork_url: result.imageUrl,
    // Parse genre from tags if available
    genre: parseGenreFromTags(result.tags),
    // Album as label fallback
    label: result.album,
    release_date: result.releaseDate,
  };
}

/**
 * Map full Bandcamp track info to RawTrackData
 *
 * @param info - Full Bandcamp track info
 * @returns RawTrackData with complete information
 */
export function mapTrackInfoToRawTrackData(info: BandcampTrackInfo): RawTrackData {
  return {
    id: info.url,
    title: info.name,
    artists: info.artist ? [info.artist] : [],
    // Bandcamp still doesn't provide BPM/Key even in full info
    bpm: undefined,
    key: undefined,
    duration_secs: info.duration,
    artwork_url: info.imageUrl,
    label: info.label || info.album,
    release_date: info.releaseDate,
  };
}

/**
 * Parse genre from Bandcamp tags string
 *
 * Bandcamp tags are comma-separated strings like "electronic, ambient, experimental"
 * We take the first tag as the primary genre.
 */
function parseGenreFromTags(tags?: string): string | undefined {
  if (!tags) return undefined;

  const tagList = tags
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
  return tagList[0];
}
