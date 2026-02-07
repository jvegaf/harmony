import fs from 'fs';
import path from 'path';

import log from 'electron-log';

import { Database } from '../db/database';
import { Config, Track, TrackId } from '../../../preload/types/harmony';
import type {
  DuplicateGroup,
  DuplicateScanProgress,
  DuplicateScanResult,
  DuplicateTrackInfo,
} from '../../../preload/types/duplicates';
import makeID from '../../../preload/lib/id-provider';

/**
 * Duplicate Finder Service
 * AIDEV-NOTE: Detects duplicate tracks in the library using HIERARCHICAL logic:
 * - Title AND Artist are MANDATORY (fuzzy matching of normalized strings)
 * - Duration is OPTIONAL (similar duration within tolerance)
 * This ensures real duplicates are found while avoiding false positives.
 */

// Format rankings for quality scoring (higher = better)
const FORMAT_QUALITY: Record<string, number> = {
  FLAC: 100,
  AIFF: 95,
  WAV: 90,
  ALAC: 85,
  MP3: 50,
  AAC: 45,
  OGG: 40,
  WMA: 30,
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Remove common track suffixes that indicate versions/remixes
 * AIDEV-NOTE: Removes common DJ/EDM track suffixes to improve duplicate detection.
 * Examples: "Track (Original Mix)" → "Track", "Song [Radio Edit]" → "Song"
 */
function removeTrackSuffixes(str: string): string {
  // Common suffixes to remove (case-insensitive)
  const suffixPatterns = [
    /\(original mix\)/gi,
    /\[original mix\]/gi,
    /\(radio edit\)/gi,
    /\[radio edit\]/gi,
    /\(extended mix\)/gi,
    /\[extended mix\]/gi,
    /\(club mix\)/gi,
    /\[club mix\]/gi,
    /\(vocal mix\)/gi,
    /\[vocal mix\]/gi,
    /\(instrumental\)/gi,
    /\[instrumental\]/gi,
    /\(dub mix\)/gi,
    /\[dub mix\]/gi,
    /\(original\)/gi,
    /\[original\]/gi,
    /\(extended\)/gi,
    /\[extended\]/gi,
    /\(clean\)/gi,
    /\[clean\]/gi,
    /\(explicit\)/gi,
    /\[explicit\]/gi,
  ];

  let cleaned = str;
  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

/**
 * Normalize a string for comparison (lowercase, remove special chars)
 * AIDEV-NOTE: First removes common track suffixes, then normalizes the string.
 */
function normalizeString(str: string | undefined): string {
  if (!str) return '';

  // Step 1: Remove common track suffixes
  const withoutSuffixes = removeTrackSuffixes(str);

  // Step 2: Normalize
  return withoutSuffixes
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Get audio format from file path
 */
function getAudioFormat(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return ext.toUpperCase();
}

/**
 * Get file size in bytes (returns 0 if file not found)
 */
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Calculate quality score for a track (higher = better quality)
 * Used for auto-selecting which track to keep
 */
function calculateQualityScore(
  track: Track,
  fileSize: number,
  format: string,
  cueCount: number,
  playlistCount: number,
): number {
  let score = 0;

  // Format quality (0-100 points)
  score += FORMAT_QUALITY[format] ?? 30;

  // Bitrate (0-50 points)
  if (track.bitrate) {
    score += Math.min(track.bitrate / 10, 50);
  }

  // File size as proxy for quality (0-20 points)
  // Larger file size often means higher quality (for same format)
  score += Math.min(fileSize / 10_000_000, 20);

  // Cue points indicate track has been curated (0-30 points)
  score += Math.min(cueCount * 10, 30);

  // Playlist membership indicates track is valued (0-20 points)
  score += Math.min(playlistCount * 5, 20);

  return score;
}

export interface DuplicateFinderOptions {
  criteria: {
    titleArtist: boolean;
    durationTitle: boolean;
  };
  durationToleranceSeconds: number;
  similarityThreshold: number;
  onProgress?: (progress: DuplicateScanProgress) => void;
}

/**
 * Find duplicate tracks in the library
 */
export async function findDuplicates(
  config: Config['duplicateFinderConfig'],
  onProgress?: (progress: DuplicateScanProgress) => void,
): Promise<DuplicateScanResult> {
  const startTime = Date.now();
  const db = Database.getInstance();

  // Report initial progress
  onProgress?.({
    phase: 'loading',
    progress: 0,
    message: 'Loading tracks from database...',
  });

  // Load all tracks
  const tracks = await db.getAllTracks();
  log.info(`[duplicate-finder] Loaded ${tracks.length} tracks for duplicate scan`);

  if (tracks.length === 0) {
    return {
      totalTracks: 0,
      groupCount: 0,
      duplicateCount: 0,
      groups: [],
      scanDurationMs: Date.now() - startTime,
    };
  }

  onProgress?.({
    phase: 'loading',
    progress: 20,
    message: `Loaded ${tracks.length} tracks. Fetching metadata...`,
  });

  // Build track info map with additional metadata
  const trackInfoMap = new Map<TrackId, DuplicateTrackInfo>();

  // Get cue counts for all tracks
  const allCues = await db.getCuePointsByTrackIds(tracks.map(t => t.id));
  const cueCountMap = new Map<TrackId, number>();
  for (const cue of allCues) {
    cueCountMap.set(cue.trackId, (cueCountMap.get(cue.trackId) ?? 0) + 1);
  }

  // Get playlist counts for all tracks
  const allPlaylists = await db.getAllPlaylists();
  const playlistCountMap = new Map<TrackId, number>();
  for (const playlist of allPlaylists) {
    // Skip internal playlists
    if (playlist.id.startsWith('__')) continue;
    for (const track of playlist.tracks ?? []) {
      playlistCountMap.set(track.id, (playlistCountMap.get(track.id) ?? 0) + 1);
    }
  }

  // Build DuplicateTrackInfo for each track
  for (const track of tracks) {
    const fileSize = getFileSize(track.path);
    const format = getAudioFormat(track.path);
    const cueCount = cueCountMap.get(track.id) ?? 0;
    const playlistCount = playlistCountMap.get(track.id) ?? 0;
    const qualityScore = calculateQualityScore(track, fileSize, format, cueCount, playlistCount);

    trackInfoMap.set(track.id, {
      track,
      fileSize,
      format,
      cueCount,
      playlistCount,
      qualityScore,
    });
  }

  onProgress?.({
    phase: 'analyzing',
    progress: 30,
    message: 'Analyzing tracks for duplicates...',
  });

  // Find duplicate groups
  const duplicateGroups: DuplicateGroup[] = [];
  const processedPairs = new Set<string>();
  const assignedToGroup = new Map<TrackId, string>(); // trackId -> groupId

  const totalComparisons = (tracks.length * (tracks.length - 1)) / 2;
  let comparisonsDone = 0;
  let lastProgressUpdate = Date.now();

  // Compare each pair of tracks
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      comparisonsDone++;

      // Throttle progress updates
      if (Date.now() - lastProgressUpdate > 100) {
        const progress = 30 + (comparisonsDone / totalComparisons) * 50;
        onProgress?.({
          phase: 'analyzing',
          progress,
          message: `Comparing tracks (${comparisonsDone}/${totalComparisons})...`,
        });
        lastProgressUpdate = Date.now();
      }

      const trackA = tracks[i];
      const trackB = tracks[j];
      const pairKey = [trackA.id, trackB.id].sort().join('|');

      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const match = checkDuplicateMatch(trackA, trackB, config);

      if (match) {
        // Check if either track is already in a group
        const existingGroupId = assignedToGroup.get(trackA.id) ?? assignedToGroup.get(trackB.id);

        if (existingGroupId) {
          // Add to existing group
          const group = duplicateGroups.find(g => g.id === existingGroupId)!;
          const infoA = trackInfoMap.get(trackA.id)!;
          const infoB = trackInfoMap.get(trackB.id)!;

          if (!assignedToGroup.has(trackA.id)) {
            group.tracks.push(infoA);
            assignedToGroup.set(trackA.id, existingGroupId);
          }
          if (!assignedToGroup.has(trackB.id)) {
            group.tracks.push(infoB);
            assignedToGroup.set(trackB.id, existingGroupId);
          }

          // Update detection method if multiple methods matched
          if (group.detectionMethod !== match.method) {
            group.detectionMethod = 'multiple';
          }
        } else {
          // Create new group
          const groupId = makeID();
          const infoA = trackInfoMap.get(trackA.id)!;
          const infoB = trackInfoMap.get(trackB.id)!;

          duplicateGroups.push({
            id: groupId,
            detectionMethod: match.method,
            similarity: match.similarity,
            tracks: [infoA, infoB],
            suggestedKeeperId: '', // Will be set below
          });

          assignedToGroup.set(trackA.id, groupId);
          assignedToGroup.set(trackB.id, groupId);
        }
      }
    }
  }

  onProgress?.({
    phase: 'grouping',
    progress: 85,
    message: `Found ${duplicateGroups.length} duplicate groups. Calculating recommendations...`,
  });

  // Calculate suggested keeper for each group (highest quality score)
  for (const group of duplicateGroups) {
    let bestTrack = group.tracks[0];
    for (const trackInfo of group.tracks) {
      if (trackInfo.qualityScore > bestTrack.qualityScore) {
        bestTrack = trackInfo;
      }
    }
    group.suggestedKeeperId = bestTrack.track.id;

    // Sort tracks by quality score (best first)
    group.tracks.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  // Sort groups by number of duplicates (descending)
  duplicateGroups.sort((a, b) => b.tracks.length - a.tracks.length);

  const scanDurationMs = Date.now() - startTime;
  const duplicateCount = duplicateGroups.reduce((sum, g) => sum + g.tracks.length - 1, 0);

  onProgress?.({
    phase: 'complete',
    progress: 100,
    message: `Scan complete. Found ${duplicateGroups.length} groups with ${duplicateCount} duplicates.`,
  });

  log.info(
    `[duplicate-finder] Scan complete: ${duplicateGroups.length} groups, ${duplicateCount} duplicates in ${scanDurationMs}ms`,
  );

  return {
    totalTracks: tracks.length,
    groupCount: duplicateGroups.length,
    duplicateCount,
    groups: duplicateGroups,
    scanDurationMs,
  };
}

interface MatchResult {
  method: 'title' | 'artist' | 'duration' | 'titleArtist' | 'titleDuration' | 'multiple';
  similarity: number;
}

/**
 * Check if two tracks are duplicates based on configured criteria
 * AIDEV-NOTE: Uses HIERARCHICAL logic for duplicate detection:
 * - Title AND Artist are MANDATORY (always must match)
 * - Duration is OPTIONAL (additional filter when enabled)
 * This prevents false positives like grouping different songs with same duration.
 */
function checkDuplicateMatch(
  trackA: Track,
  trackB: Track,
  config: Config['duplicateFinderConfig'],
): MatchResult | null {
  const { criteria, similarityThreshold, durationToleranceSeconds } = config;

  // STEP 1: Check title similarity (MANDATORY)
  const titleA = normalizeString(trackA.title);
  const titleB = normalizeString(trackB.title);
  const titleSim = stringSimilarity(titleA, titleB);

  if (titleSim < similarityThreshold) {
    return null; // Title doesn't match = not a duplicate
  }

  // STEP 2: Check artist similarity (MANDATORY)
  const artistA = normalizeString(trackA.artist);
  const artistB = normalizeString(trackB.artist);
  const artistSim = stringSimilarity(artistA, artistB);

  if (artistSim < similarityThreshold) {
    return null; // Artist doesn't match = not a duplicate
  }

  // STEP 3: Check duration similarity (OPTIONAL - only if enabled)
  if (criteria.duration) {
    const durationDiff = Math.abs(trackA.duration - trackB.duration);

    if (durationDiff > durationToleranceSeconds) {
      return null; // Duration check enabled but doesn't match = not a duplicate
    }
  }

  // All required criteria passed - tracks are duplicates
  const avgSimilarity = (titleSim + artistSim) / 2;

  return {
    method: criteria.duration ? 'multiple' : 'titleArtist',
    similarity: avgSimilarity,
  };
}

/**
 * Get file info for a track
 */
export async function getTrackFileInfo(
  trackId: TrackId,
): Promise<{ trackId: TrackId; fileSize: number; format: string; exists: boolean }> {
  const db = Database.getInstance();
  const track = await db.findTrackByID(trackId);

  const exists = fs.existsSync(track.path);
  const fileSize = exists ? getFileSize(track.path) : 0;
  const format = getAudioFormat(track.path);

  return {
    trackId,
    fileSize,
    format,
    exists,
  };
}
