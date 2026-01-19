/**
 * Track Mapper
 *
 * Maps between Traktor NML entries and Harmony Track objects.
 *
 * AIDEV-NOTE: Key conversions:
 * - Path: Traktor uses "/:dir/:subdir/:" format, we use Unix paths
 * - Rating: Traktor 0-255 -> Harmony 0-5 stars
 * - Bitrate: Traktor stores bps, we use kbps
 * - BPM: Traktor stores float, we use rounded integer
 * - Key: Uses key-mapper for Open Key notation conversion
 */

import type { Track, TrackRating } from '../../../../preload/types/harmony';
import type { TraktorEntry } from '../types/nml-types';
import { mapTraktorKey } from './key-mapper';

/**
 * Convert Traktor path format to system path.
 *
 * Traktor format: DIR="/:Users/:josev/:Music/:" FILE="track.mp3"
 * System format:  /Users/josev/Music/track.mp3
 *
 * @param dir - Traktor DIR attribute (e.g., "/:Users/:josev/:Music/:")
 * @param file - Filename
 * @returns Unix-style path
 */
export function mapTraktorPathToSystem(dir: string, file: string): string {
  // Traktor format: "/:Users/:josev/:Music/:BOX/:2601/:"
  // Need to convert to: "/Users/josev/Music/BOX/2601"

  // Remove leading /: and replace all /: with /
  let systemDir = dir.replace(/\/:/g, '/');

  // Remove trailing slash if present (from the trailing /: -> /)
  if (systemDir.endsWith('/')) {
    systemDir = systemDir.slice(0, -1);
  }

  return `${systemDir}/${file}`;
}

/**
 * Convert system path to Traktor format.
 *
 * @param systemPath - Unix-style path
 * @returns Object with dir and file in Traktor format
 */
export function mapSystemPathToTraktor(systemPath: string): { dir: string; file: string } {
  const lastSlash = systemPath.lastIndexOf('/');
  const dir = systemPath.substring(0, lastSlash) || '/';
  const file = systemPath.substring(lastSlash + 1);

  // Handle root-level file (dir is just "/")
  if (dir === '/') {
    return { dir: '/:', file };
  }

  // Convert /Users/josev/Music -> /:Users/:josev/:Music/:
  const parts = dir.split('/').filter(part => part !== '');
  const traktorDir = '/:' + parts.join('/:') + '/:';

  return {
    dir: traktorDir,
    file,
  };
}

/**
 * Convert Traktor rating (0-255) to Harmony rating (0-5 stars).
 *
 * Traktor scale: 0, 51, 102, 153, 204, 255 for 0-5 stars
 *
 * @param ranking - Traktor RANKING value as string
 * @returns Star rating 0-5
 */
export function mapTraktorRating(ranking: string | undefined): number {
  if (!ranking) return 0;
  const value = parseInt(ranking, 10);
  if (isNaN(value)) return 0;
  return Math.round(value / 51);
}

/**
 * Convert Harmony rating (0-5) to Traktor rating (0-255).
 *
 * @param stars - Star rating 0-5
 * @returns Traktor RANKING value as string
 */
export function mapHarmonyRatingToTraktor(stars: number): string {
  return String(stars * 51);
}

/**
 * Parse Traktor BPM string to integer.
 *
 * @param bpm - BPM as float string (e.g., "123.000061")
 * @returns Rounded BPM integer or undefined
 */
export function mapTraktorBpm(bpm: string | undefined): number | undefined {
  if (!bpm) return undefined;
  const value = parseFloat(bpm);
  if (isNaN(value)) return undefined;
  return Math.round(value);
}

/**
 * Parse Traktor date format (YYYY/M/D) to Date object.
 *
 * @param dateStr - Date string (e.g., "2026/1/15")
 * @returns Date object or undefined
 */
export function parseTraktorDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return undefined;

  const [year, month, day] = parts.map(p => parseInt(p, 10));
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;

  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Generate a stable ID from file path.
 * Uses a simple hash for now - can be replaced with proper UUID generation.
 *
 * @param path - File path
 * @returns Unique ID string
 */
function generateTrackId(path: string): string {
  // Simple hash function for stable IDs
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Map a Traktor NML entry to a Harmony Track object.
 *
 * @param entry - Traktor entry from collection.nml
 * @returns Harmony Track object
 */
export function mapTraktorEntryToTrack(entry: TraktorEntry): Track {
  const path = mapTraktorPathToSystem(entry.LOCATION.DIR, entry.LOCATION.FILE);
  const info = entry.INFO;
  const tempo = entry.TEMPO;

  // Build rating object if present
  let rating: TrackRating | undefined;
  if (info?.RANKING) {
    const ratingValue = mapTraktorRating(info.RANKING);
    if (ratingValue > 0) {
      rating = {
        rating: ratingValue,
        source: 'traktor',
      };
    }
  }

  // Extract year from RELEASE_DATE
  let year: number | undefined;
  if (info?.RELEASE_DATE) {
    const releaseDate = parseTraktorDate(info.RELEASE_DATE);
    if (releaseDate) {
      year = releaseDate.getFullYear();
    }
  }

  // Map key from INFO.KEY (Open Key notation like "1m", "12d")
  let initialKey: string | undefined;
  if (info?.KEY) {
    initialKey = mapTraktorKey(info.KEY);
  }

  // Convert bitrate from bps to kbps
  let bitrate: number | undefined;
  if (info?.BITRATE) {
    const bps = parseInt(info.BITRATE, 10);
    if (!isNaN(bps)) {
      bitrate = Math.round(bps / 1000);
    }
  }

  return {
    id: generateTrackId(path),
    path,
    title: entry.TITLE || entry.LOCATION.FILE,
    artist: entry.ARTIST,
    album: entry.ALBUM?.TITLE,
    genre: info?.GENRE,
    year,
    duration: info?.PLAYTIME ? parseInt(info.PLAYTIME, 10) : 0,
    bitrate,
    bpm: tempo?.BPM ? mapTraktorBpm(tempo.BPM) : undefined,
    initialKey,
    rating,
    comment: info?.COMMENT,
  };
}

/**
 * Map a Harmony Track to Traktor entry (partial).
 * Used for syncing changes back to NML.
 *
 * AIDEV-NOTE: This returns partial data that needs to be merged
 * with existing NML entry data. Full entry construction is in the writer.
 *
 * @param track - Harmony Track object
 * @returns Partial Traktor entry data
 */
export function mapTrackToTraktorEntry(track: Track): Partial<TraktorEntry> {
  const { dir, file } = mapSystemPathToTraktor(track.path);

  return {
    TITLE: track.title,
    ARTIST: track.artist,
    LOCATION: {
      DIR: dir,
      FILE: file,
      VOLUME: 'C:', // Default volume, will be updated by writer
    },
    ALBUM: track.album ? { TITLE: track.album } : undefined,
    INFO: {
      GENRE: track.genre,
      COMMENT: track.comment,
      RANKING: track.rating ? mapHarmonyRatingToTraktor(track.rating.rating) : undefined,
      RELEASE_DATE: track.year ? `${track.year}/1/1` : undefined,
      PLAYTIME: track.duration ? String(track.duration) : undefined,
      BITRATE: track.bitrate ? String(track.bitrate * 1000) : undefined,
      // KEY: would need reverse key mapping
    },
    TEMPO: track.bpm
      ? {
          BPM: String(track.bpm),
        }
      : undefined,
  };
}
