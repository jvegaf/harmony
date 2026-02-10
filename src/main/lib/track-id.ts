import { createHash } from 'crypto';

/**
 * AIDEV-NOTE: Track ID generation for main process only.
 * Uses Node.js crypto module, which is NOT available in browser/renderer.
 *
 * This file should only be imported in:
 * - src/main/** (main process)
 * - Never in src/renderer/** (renderer/browser)
 * - Never in src/preload/** if preload code is used by renderer
 */

/**
 * Generate a deterministic track ID from file path.
 *
 * AIDEV-NOTE: Same file path always produces same ID regardless of import source.
 * This enables deduplication across filesystem and Traktor imports.
 *
 * Uses SHA-256 hash truncated to 16 chars (64 bits) for:
 * - Compatibility with existing ID format (16 uppercase hex chars)
 * - Sufficient entropy for music collections (collision-resistant up to millions of tracks)
 * - Deterministic generation (same path = same ID always)
 *
 * Path normalization:
 * - Slashes: All backslashes converted to forward slashes (\ → /)
 * - Case: Lowercased on Windows/macOS (case-insensitive filesystems)
 * - Case: Preserved on Linux (case-sensitive filesystem)
 *
 * This ensures that "C:\Music\track.mp3" and "C:/Music/track.mp3" produce
 * the same ID, preventing duplicates from different import sources.
 *
 * @param filePath - Absolute file path to the track
 * @returns 16-character uppercase hexadecimal ID
 */
export function makeTrackID(filePath: string): string {
  // Normalize path separators to forward slashes for consistent hashing
  // across different import sources (filesystem uses \, Traktor uses /)
  let normalized = filePath.replace(/\\/g, '/');

  // Windows/macOS: also lowercase for case-insensitive filesystems
  if (process.platform !== 'linux') {
    normalized = normalized.toLowerCase();
  }

  // Generate SHA-256 hash and take first 16 chars (64 bits)
  return createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 16).toUpperCase();
}
