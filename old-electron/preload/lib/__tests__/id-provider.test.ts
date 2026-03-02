/**
 * ID Provider Tests
 *
 * Tests for random UUID generation (browser-compatible).
 *
 * AIDEV-NOTE: Tests random UUIDs (makeID) for playlists/folders.
 * For track ID tests (makeTrackID), see src/main/lib/__tests__/track-id.test.ts
 */

import { describe, it, expect } from 'vitest';
import makeID from '../id-provider';

describe('makeID', () => {
  it('should generate unique UUIDs', () => {
    const id1 = makeID();
    const id2 = makeID();
    expect(id1).not.toBe(id2);
  });

  it('should return a 16-char uppercase string', () => {
    const id = makeID();
    expect(id).toMatch(/^[0-9A-F]{16}$/);
  });

  it('should generate different IDs on each call', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(makeID());
    }
    expect(ids.size).toBe(100);
  });
});
