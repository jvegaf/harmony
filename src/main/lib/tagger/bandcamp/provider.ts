/**
 * Bandcamp Provider
 *
 * AIDEV-NOTE: Implements TrackProvider interface for Bandcamp.
 * Key differences from Beatport/Traxsource:
 * - No BPM or Key metadata available
 * - Track ID is the full URL
 * - Two-phase: search returns minimal data, full details fetched on apply
 *
 * When applying tags from Bandcamp, the tagger should trigger audio analysis
 * to detect BPM and Key.
 */

import log from 'electron-log';

import { TrackProvider, RawTrackData } from '../providers/types';
import { BandcampClient, getBandcampClient } from './client';
import { mapSearchResultToRawTrackData } from './mapper';

/**
 * Bandcamp provider implementing TrackProvider interface
 */
export class BandcampProvider implements TrackProvider {
  readonly name = 'bandcamp' as const;

  constructor(private client: BandcampClient) {}

  /**
   * Search for tracks on Bandcamp
   *
   * @param title - Track title
   * @param artist - Track artist
   * @returns List of raw track data (without BPM/Key)
   */
  async search(title: string, artist: string): Promise<RawTrackData[]> {
    try {
      // Build search query combining artist and title
      const query = artist ? `${artist} ${title}` : title;

      log.info(`[BandcampProvider] Searching: "${query}"`);

      const results = await this.client.searchTracks(query);

      // Map search results to RawTrackData
      const rawData = results.map(mapSearchResultToRawTrackData);

      log.info(`[BandcampProvider] Returning ${rawData.length} candidates`);
      return rawData;
    } catch (error) {
      log.error('[BandcampProvider] Search failed:', error);
      return [];
    }
  }

  /**
   * Get full track details from Bandcamp
   *
   * AIDEV-NOTE: This method is not part of TrackProvider interface but is
   * needed for the apply phase to get complete track info including duration.
   *
   * @param trackUrl - Full Bandcamp track URL
   * @returns Full raw track data
   */
  async getTrackDetails(trackUrl: string): Promise<RawTrackData | null> {
    try {
      const info = await this.client.getTrackInfo(trackUrl);
      if (!info) return null;

      return {
        id: info.url,
        title: info.name,
        artists: info.artist ? [info.artist] : [],
        bpm: undefined,
        key: undefined,
        duration_secs: info.duration,
        artwork_url: info.imageUrl,
        label: info.label || info.album,
        release_date: info.releaseDate,
      };
    } catch (error) {
      log.error(`[BandcampProvider] Failed to get track details for ${trackUrl}:`, error);
      return null;
    }
  }
}

/**
 * Factory to create BandcampProvider instance
 */
export function createBandcampProvider(): BandcampProvider {
  const client = getBandcampClient();
  return new BandcampProvider(client);
}
