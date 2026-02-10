/**
 * Track ID generation tests
 *
 * Tests deterministic ID generation from file paths with proper normalization.
 */

import { describe, it, expect } from 'vitest';
import { makeTrackID } from '../track-id';

describe('makeTrackID()', () => {
  it('should generate deterministic IDs', () => {
    const path1 = '/Users/josev/Music/track.mp3';
    const path2 = '/Users/josev/Music/track.mp3';

    const id1 = makeTrackID(path1);
    const id2 = makeTrackID(path2);

    expect(id1).toBe(id2);
  });

  it('should generate 16-character uppercase hex IDs', () => {
    const id = makeTrackID('/test/track.mp3');

    expect(id).toMatch(/^[A-F0-9]{16}$/);
    expect(id.length).toBe(16);
  });

  it('should normalize backslashes to forward slashes', () => {
    const pathWithForward = 'C:/Users/josev/Music/track.mp3';
    const pathWithBackward = 'C:\\Users\\josev\\Music\\track.mp3';

    const id1 = makeTrackID(pathWithForward);
    const id2 = makeTrackID(pathWithBackward);

    // AIDEV-NOTE: This is the key test for duplicate prevention.
    // Same file with different slash formats must produce the same ID.
    expect(id1).toBe(id2);
  });

  it('should normalize mixed slashes', () => {
    const path1 = 'C:/Users/josev\\Music\\track.mp3';
    const path2 = 'C:\\Users\\josev/Music/track.mp3';
    const path3 = 'C:/Users/josev/Music/track.mp3';

    const id1 = makeTrackID(path1);
    const id2 = makeTrackID(path2);
    const id3 = makeTrackID(path3);

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  it('should be case-insensitive on Windows/macOS', () => {
    // Mock process.platform for this test
    const originalPlatform = process.platform;

    // Only test case-sensitivity on non-Linux platforms
    if (process.platform !== 'linux') {
      const pathLower = 'c:/users/josev/music/track.mp3';
      const pathUpper = 'C:/USERS/JOSEV/MUSIC/TRACK.MP3';
      const pathMixed = 'C:/Users/Josev/Music/Track.mp3';

      const id1 = makeTrackID(pathLower);
      const id2 = makeTrackID(pathUpper);
      const id3 = makeTrackID(pathMixed);

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    }

    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('should be case-sensitive on Linux', () => {
    // This test only makes sense on Linux, but we can't easily mock process.platform
    // in a way that affects the function, so we just document the expected behavior
    if (process.platform === 'linux') {
      const pathLower = '/users/josev/music/track.mp3';
      const pathUpper = '/USERS/JOSEV/MUSIC/TRACK.MP3';

      const id1 = makeTrackID(pathLower);
      const id2 = makeTrackID(pathUpper);

      expect(id1).not.toBe(id2);
    }
  });

  it('should generate different IDs for different paths', () => {
    const id1 = makeTrackID('/Users/josev/Music/track1.mp3');
    const id2 = makeTrackID('/Users/josev/Music/track2.mp3');

    expect(id1).not.toBe(id2);
  });

  it('should handle special characters in paths', () => {
    const path = '/Users/josev/Music/Track & Beat [2024].mp3';
    const id = makeTrackID(path);

    expect(id).toMatch(/^[A-F0-9]{16}$/);
  });

  it('should handle Unicode characters', () => {
    const path = '/Users/josev/Música/Drøpz/Café.mp3';
    const id = makeTrackID(path);

    expect(id).toMatch(/^[A-F0-9]{16}$/);
  });

  it('should handle long paths', () => {
    const path = '/Users/josev/Music/Very/Deep/Nested/Directory/Structure/With/Many/Levels/track.mp3';
    const id = makeTrackID(path);

    expect(id).toMatch(/^[A-F0-9]{16}$/);
    expect(id.length).toBe(16);
  });

  it('should handle Windows-style paths with drive letters', () => {
    const pathC = 'C:\\Users\\josev\\Music\\track.mp3';
    const pathD = 'D:\\Users\\josev\\Music\\track.mp3';

    const idC = makeTrackID(pathC);
    const idD = makeTrackID(pathD);

    // Different drives should produce different IDs
    expect(idC).not.toBe(idD);
  });
});
