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

import path from 'path';

import type { Track, TrackRating } from '../../../../preload/types/harmony';
import type { TraktorEntry } from '../types/nml-types';
import { mapTraktorKey } from './key-mapper';
import { makeTrackID } from '../../track-id';

/**
 * Convert Traktor path format to system path.
 *
 * AIDEV-NOTE: Produces OS-native paths with proper drive letters and separators.
 * This ensures Traktor imports generate the same paths as filesystem imports,
 * enabling proper deduplication via makeTrackID().
 *
 * Traktor format: DIR="/:Users/:josev/:Music/:" FILE="track.mp3" VOLUME="C:"
 * Windows output:  C:\Users\josev\Music\track.mp3
 * Linux output:    /Users/josev/Music/track.mp3
 *
 * @param dir - Traktor DIR attribute (e.g., "/:Users/:josev/:Music/:")
 * @param file - Filename
 * @param volume - Optional VOLUME attribute (e.g., "C:" on Windows)
 * @returns OS-native absolute path
 */
export function mapTraktorPathToSystem(dir: string, file: string, volume?: string): string {
  // Traktor format: "/:Users/:josev/:Music/:BOX/:2601/:"
  // Need to convert to: "/Users/josev/Music/BOX/2601" (or "C:/Users/..." with volume)

  // Remove leading /: and replace all /: with /
  let systemDir = dir.replace(/\/:/g, '/');

  // Remove trailing slash if present (from the trailing /: -> /)
  if (systemDir.endsWith('/')) {
    systemDir = systemDir.slice(0, -1);
  }

  // Combine with volume if present (e.g., "C:" + "/Users/..." → "C:/Users/...")
  const fullPath = volume ? `${volume}${systemDir}/${file}` : `${systemDir}/${file}`;

  // Normalize to OS-native separators using path.resolve()
  // On Windows: C:/Users/... → C:\Users\...
  // On Linux: stays as /Users/...
  // This matches the path format from filesystem import (IPCLibraryModule.ts:153)
  return path.resolve(fullPath);
}

/**
 * Convert system path to Traktor format.
 *
 * AIDEV-NOTE: Handles both Unix-style and Windows-style paths.
 * Extracts Windows drive letter (e.g., "C:") to VOLUME attribute.
 *
 * @param systemPath - OS-native absolute path (Unix or Windows style)
 * @returns Object with dir, file, and volume in Traktor format
 */
export function mapSystemPathToTraktor(systemPath: string): { dir: string; file: string; volume: string } {
  // Normalize to forward slashes for Traktor format
  let normalized = systemPath.split(path.sep).join('/');

  // Extract and remove Windows volume prefix (e.g., "C:")
  let volume = '';
  if (/^[A-Z]:/i.test(normalized)) {
    volume = normalized.substring(0, 2).toUpperCase();
    normalized = normalized.substring(2);
  }

  const lastSlash = normalized.lastIndexOf('/');
  const dir = normalized.substring(0, lastSlash) || '/';
  const file = normalized.substring(lastSlash + 1);

  // Handle root-level file (dir is just "/")
  if (dir === '/') {
    return { dir: '/:', file, volume };
  }

  // Convert /Users/josev/Music -> /:Users/:josev/:Music/:
  const parts = dir.split('/').filter(part => part !== '');
  const traktorDir = '/:' + parts.join('/:') + '/:';

  return {
    dir: traktorDir,
    file,
    volume,
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
 * Map a Traktor NML entry to a Harmony Track object.
 *
 * AIDEV-NOTE: Uses makeTrackID() for deterministic ID generation.
 * This ensures the same file always gets the same ID regardless of
 * import source (Traktor vs filesystem scanner).
 *
 * Path handling: Passes VOLUME to mapTraktorPathToSystem() to produce
 * OS-native paths (e.g., "C:\Users\..." on Windows) that match filesystem import.
 *
 * @param entry - Traktor entry from collection.nml
 * @returns Harmony Track object
 */
export function mapTraktorEntryToTrack(entry: TraktorEntry): Track {
  const path = mapTraktorPathToSystem(entry.LOCATION.DIR, entry.LOCATION.FILE, entry.LOCATION.VOLUME);
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
  let releaseDate: string | undefined;
  if (info?.RELEASE_DATE) {
    // AIDEV-NOTE: Preserve full release date for round-trip
    releaseDate = info.RELEASE_DATE;
    const parsedDate = parseTraktorDate(info.RELEASE_DATE);
    if (parsedDate) {
      year = parsedDate.getFullYear();
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
    id: makeTrackID(path),
    path,
    title: entry.TITLE || entry.LOCATION.FILE,
    artist: entry.ARTIST,
    album: entry.ALBUM?.TITLE,
    genre: info?.GENRE,
    year,
    releaseDate, // AIDEV-NOTE: Preserve full date for round-trip
    duration: info?.PLAYTIME ? parseInt(info.PLAYTIME, 10) : 0,
    bitrate,
    bpm: tempo?.BPM ? mapTraktorBpm(tempo.BPM) : undefined,
    bpmPrecise: tempo?.BPM, // AIDEV-NOTE: Preserve precise BPM for round-trip
    initialKey,
    rating,
    label: info?.LABEL,
    comment: info?.COMMENT,
  };
}

/**
 * Map a Harmony Track to Traktor entry (partial).
 * Used for syncing changes back to NML.
 *
 * AIDEV-NOTE: This returns partial data that needs to be merged
 * with existing NML entry data. Full entry construction is in the writer.
 * Uses bpmPrecise and releaseDate when available for round-trip accuracy.
 *
 * @param track - Harmony Track object
 * @returns Partial Traktor entry data
 */
export function mapTrackToTraktorEntry(track: Track): Partial<TraktorEntry> {
  const { dir, file, volume } = mapSystemPathToTraktor(track.path);

  // AIDEV-NOTE: Use releaseDate if available, otherwise fallback to year/1/1
  const releaseDate = track.releaseDate || (track.year ? `${track.year}/1/1` : undefined);

  // AIDEV-NOTE: Use bpmPrecise if available for full precision, otherwise use rounded bpm
  const bpmValue = track.bpmPrecise || (track.bpm ? String(track.bpm) : undefined);

  return {
    TITLE: track.title,
    ARTIST: track.artist,
    LOCATION: {
      DIR: dir,
      FILE: file,
      VOLUME: volume,
    },
    ALBUM: track.album ? { TITLE: track.album } : undefined,
    INFO: {
      GENRE: track.genre,
      COMMENT: track.comment,
      RANKING: track.rating ? mapHarmonyRatingToTraktor(track.rating.rating) : undefined,
      RELEASE_DATE: releaseDate,
      PLAYTIME: track.duration ? String(track.duration) : undefined,
      BITRATE: track.bitrate ? String(track.bitrate * 1000) : undefined,
      // KEY: would need reverse key mapping
    },
    TEMPO: bpmValue
      ? {
          BPM: bpmValue,
        }
      : undefined,
  };
}
