/**
 * Bandcamp Client
 *
 * AIDEV-NOTE: Wrapper around bandcamp-fetch library for searching and fetching
 * track details from Bandcamp. This replaces the old @alexjorgef/bandcamp-scraper.
 *
 * Key differences from other providers:
 * - Bandcamp does NOT provide BPM or Key metadata
 * - Track IDs are full URLs (e.g., "https://artist.bandcamp.com/track/song")
 * - Two-phase approach: quick search -> full details on apply
 */

import log from '../worker/worker-logger';
import bcfetch, { type SearchResultTrack, type Track as BandcampTrack } from 'bandcamp-fetch';

/**
 * Search result from Bandcamp (quick search, minimal data)
 */
export interface BandcampSearchResult {
  /** Full track URL (used as ID) */
  url: string;
  /** Track name */
  name: string;
  /** Artist name */
  artist?: string;
  /** Album name */
  album?: string;
  /** Release date string */
  releaseDate?: string;
  /** Image URL */
  imageUrl?: string;
  /** Tags (comma-separated) */
  tags?: string;
}

/**
 * Full track info from Bandcamp (fetched on apply)
 */
export interface BandcampTrackInfo {
  /** Full track URL */
  url: string;
  /** Track name */
  name: string;
  /** Artist name */
  artist?: string;
  /** Album name */
  album?: string;
  /** Label name */
  label?: string;
  /** Release date */
  releaseDate?: string;
  /** Image URL (high quality) */
  imageUrl?: string;
  /** Duration in seconds */
  duration?: number;
  /** Stream URL for preview (if available) */
  streamUrl?: string;
}

/**
 * Bandcamp API client using bandcamp-fetch
 */
export class BandcampClient {
  private static instance: BandcampClient | null = null;

  private constructor() {
    log.info('[BandcampClient] Initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BandcampClient {
    if (!BandcampClient.instance) {
      BandcampClient.instance = new BandcampClient();
    }
    return BandcampClient.instance;
  }

  /**
   * Search for tracks on Bandcamp
   *
   * @param query - Search query (usually "artist title")
   * @returns List of search results
   */
  public async searchTracks(query: string): Promise<BandcampSearchResult[]> {
    try {
      log.info(`[BandcampClient] Searching for: "${query}"`);

      const results = await bcfetch.search.tracks({ query });

      const mappedResults: BandcampSearchResult[] = results.items.map((item: SearchResultTrack) => ({
        url: item.url,
        name: item.name,
        artist: item.artist,
        album: item.album,
        releaseDate: item.releaseDate,
        imageUrl: item.imageUrl,
        tags: item.tags,
      }));

      log.info(`[BandcampClient] Found ${mappedResults.length} tracks`);
      return mappedResults;
    } catch (error) {
      log.error('[BandcampClient] Search failed:', error);
      return [];
    }
  }

  /**
   * Get full track info from Bandcamp
   *
   * AIDEV-NOTE: This is called during the "apply" phase to get complete
   * track details including duration. Bandcamp still won't have BPM/Key,
   * which is why we trigger audio analysis after applying Bandcamp tags.
   *
   * @param trackUrl - Full track URL
   * @returns Full track info
   */
  public async getTrackInfo(trackUrl: string): Promise<BandcampTrackInfo | null> {
    try {
      log.info(`[BandcampClient] Fetching track info: ${trackUrl}`);

      const track: BandcampTrack = await bcfetch.track.getInfo({ trackUrl });

      const info: BandcampTrackInfo = {
        url: trackUrl,
        name: track.name,
        artist: track.artist?.name,
        album: track.album?.name,
        label: track.label?.name,
        releaseDate: track.releaseDate,
        imageUrl: track.imageUrl,
        duration: track.duration,
        streamUrl: track.streamUrl || track.streamUrlHQ,
      };

      log.info(`[BandcampClient] Got track: "${info.name}" by "${info.artist}"`);
      return info;
    } catch (error) {
      log.error(`[BandcampClient] Failed to get track info for ${trackUrl}:`, error);
      return null;
    }
  }
}

/**
 * Factory function to get BandcampClient instance
 */
export function getBandcampClient(): BandcampClient {
  return BandcampClient.getInstance();
}
