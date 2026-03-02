/**
 * Conflict Resolver Tests
 *
 * Tests for the smart merge strategy:
 * - Traktor data fills empty Harmony fields (smart merge)
 * - Harmony data takes precedence when both have values
 * - Cue points use replacement strategy per track
 *
 * AIDEV-NOTE: The approved strategy is "smart merge" - Traktor data
 * only fills in empty fields in Harmony, never overwrites existing data.
 */

import { describe, it, expect } from 'vitest';

import type { Track } from '../../../../preload/types/harmony';
import type { CuePoint, CueType } from '../../../../preload/types/cue-point';
import { mergeTrack, mergeCuePoints, MergeStrategy } from '../sync/conflict-resolver';

// Helper to create a minimal track
function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-id',
    path: '/test/path.mp3',
    title: 'Test Track',
    duration: 180,
    ...overrides,
  };
}

// Helper to create a cue point
function createCuePoint(overrides: Partial<CuePoint> = {}): CuePoint {
  return {
    id: 'cue-1',
    trackId: 'test-id',
    type: 'hot_cue' as CueType,
    positionMs: 1000,
    ...overrides,
  };
}

describe('conflict-resolver', () => {
  describe('mergeTrack', () => {
    describe('with SMART_MERGE strategy (default)', () => {
      it('should fill empty Harmony fields with Traktor data', () => {
        const harmony: Track = createTrack({
          title: 'My Title',
          artist: undefined,
          album: undefined,
          bpm: undefined,
        });

        const traktor: Track = createTrack({
          title: 'Traktor Title',
          artist: 'Traktor Artist',
          album: 'Traktor Album',
          bpm: 128,
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.title).toBe('My Title'); // Harmony has value - keep it
        expect(result.merged.artist).toBe('Traktor Artist'); // Harmony empty - fill from Traktor
        expect(result.merged.album).toBe('Traktor Album'); // Harmony empty - fill from Traktor
        expect(result.merged.bpm).toBe(128); // Harmony empty - fill from Traktor
      });

      it('should keep Harmony data when both have values', () => {
        const harmony: Track = createTrack({
          title: 'Harmony Title',
          artist: 'Harmony Artist',
          bpm: 130,
          genre: 'House',
        });

        const traktor: Track = createTrack({
          title: 'Traktor Title',
          artist: 'Traktor Artist',
          bpm: 128,
          genre: 'Techno',
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.title).toBe('Harmony Title');
        expect(result.merged.artist).toBe('Harmony Artist');
        expect(result.merged.bpm).toBe(130);
        expect(result.merged.genre).toBe('House');
      });

      it('should preserve Harmony id and path', () => {
        const harmony: Track = createTrack({
          id: 'harmony-id-123',
          path: '/harmony/path.mp3',
        });

        const traktor: Track = createTrack({
          id: 'traktor-id-456',
          path: '/traktor/path.mp3',
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.id).toBe('harmony-id-123');
        expect(result.merged.path).toBe('/harmony/path.mp3');
      });

      it('should report fields that were filled', () => {
        const harmony: Track = createTrack({
          artist: undefined,
          bpm: undefined,
        });

        const traktor: Track = createTrack({
          artist: 'Artist',
          bpm: 128,
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.fieldsUpdated).toContain('artist');
        expect(result.fieldsUpdated).toContain('bpm');
        expect(result.fieldsUpdated).not.toContain('title'); // Both had values
      });

      it('should handle rating merge correctly', () => {
        const harmony: Track = createTrack({
          rating: undefined,
        });

        const traktor: Track = createTrack({
          rating: { rating: 4, source: 'traktor' },
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.rating?.rating).toBe(4);
        expect(result.merged.rating?.source).toBe('traktor');
        expect(result.fieldsUpdated).toContain('rating');
      });

      it('should not overwrite existing rating', () => {
        const harmony: Track = createTrack({
          rating: { rating: 5, source: 'harmony' },
        });

        const traktor: Track = createTrack({
          rating: { rating: 3, source: 'traktor' },
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.rating?.rating).toBe(5);
        expect(result.merged.rating?.source).toBe('harmony');
        expect(result.fieldsUpdated).not.toContain('rating');
      });

      it('should handle empty string as missing value', () => {
        const harmony: Track = createTrack({
          artist: '',
          genre: '  ', // whitespace only
        });

        const traktor: Track = createTrack({
          artist: 'Traktor Artist',
          genre: 'Techno',
        });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.artist).toBe('Traktor Artist');
        expect(result.merged.genre).toBe('Techno');
      });

      it('should report hasChanges correctly', () => {
        // No changes case
        const harmony1: Track = createTrack({
          title: 'Same',
          artist: 'Same',
        });
        const traktor1: Track = createTrack({
          title: 'Different',
          artist: 'Different',
        });

        const result1 = mergeTrack(harmony1, traktor1);
        expect(result1.hasChanges).toBe(false); // Harmony already has values

        // Has changes case
        const harmony2: Track = createTrack({
          artist: undefined,
        });
        const traktor2: Track = createTrack({
          artist: 'New Artist',
        });

        const result2 = mergeTrack(harmony2, traktor2);
        expect(result2.hasChanges).toBe(true);
      });

      it('should handle year field', () => {
        const harmony: Track = createTrack({ year: undefined });
        const traktor: Track = createTrack({ year: 2023 });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.year).toBe(2023);
        expect(result.fieldsUpdated).toContain('year');
      });

      it('should handle initialKey field', () => {
        const harmony: Track = createTrack({ initialKey: undefined });
        const traktor: Track = createTrack({ initialKey: 'Am' });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.initialKey).toBe('Am');
        expect(result.fieldsUpdated).toContain('initialKey');
      });

      it('should handle comment field', () => {
        const harmony: Track = createTrack({ comment: undefined });
        const traktor: Track = createTrack({ comment: 'Great track!' });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.comment).toBe('Great track!');
        expect(result.fieldsUpdated).toContain('comment');
      });

      it('should preserve duration from Harmony', () => {
        const harmony: Track = createTrack({ duration: 180 });
        const traktor: Track = createTrack({ duration: 200 });

        const result = mergeTrack(harmony, traktor);

        // Duration should use the Harmony value
        expect(result.merged.duration).toBe(180);
      });

      it('should preserve waveformPeaks from Harmony', () => {
        const peaks = [0.1, 0.5, 0.8, 0.3];
        const harmony: Track = createTrack({ waveformPeaks: peaks });
        const traktor: Track = createTrack({ waveformPeaks: undefined });

        const result = mergeTrack(harmony, traktor);

        expect(result.merged.waveformPeaks).toEqual(peaks);
      });
    });

    describe('with TRAKTOR_WINS strategy', () => {
      it('should overwrite Harmony data with Traktor data', () => {
        const harmony: Track = createTrack({
          title: 'Harmony Title',
          artist: 'Harmony Artist',
        });

        const traktor: Track = createTrack({
          title: 'Traktor Title',
          artist: 'Traktor Artist',
        });

        const result = mergeTrack(harmony, traktor, MergeStrategy.TRAKTOR_WINS);

        expect(result.merged.title).toBe('Traktor Title');
        expect(result.merged.artist).toBe('Traktor Artist');
      });

      it('should still preserve Harmony id and path', () => {
        const harmony: Track = createTrack({
          id: 'harmony-id',
          path: '/harmony/path.mp3',
        });

        const traktor: Track = createTrack({
          id: 'traktor-id',
          path: '/traktor/path.mp3',
        });

        const result = mergeTrack(harmony, traktor, MergeStrategy.TRAKTOR_WINS);

        // id and path should always come from Harmony
        expect(result.merged.id).toBe('harmony-id');
        expect(result.merged.path).toBe('/harmony/path.mp3');
      });
    });

    describe('with HARMONY_WINS strategy', () => {
      it('should keep all Harmony data, ignoring Traktor', () => {
        const harmony: Track = createTrack({
          title: 'Harmony Title',
          artist: undefined, // Even empty fields stay empty
        });

        const traktor: Track = createTrack({
          title: 'Traktor Title',
          artist: 'Traktor Artist',
        });

        const result = mergeTrack(harmony, traktor, MergeStrategy.HARMONY_WINS);

        expect(result.merged.title).toBe('Harmony Title');
        expect(result.merged.artist).toBeUndefined();
        expect(result.hasChanges).toBe(false);
      });
    });
  });

  describe('mergeCuePoints', () => {
    it('should use Traktor cue points when Harmony has none', () => {
      const harmonyCues: CuePoint[] = [];
      const traktorCues: CuePoint[] = [
        createCuePoint({ id: 'cue-1', positionMs: 1000 }),
        createCuePoint({ id: 'cue-2', positionMs: 2000 }),
      ];

      const result = mergeCuePoints(harmonyCues, traktorCues, 'track-1');

      expect(result.merged).toHaveLength(2);
      expect(result.hasChanges).toBe(true);
      expect(result.added).toBe(2);
    });

    it('should keep Harmony cue points when present (smart merge)', () => {
      const harmonyCues: CuePoint[] = [createCuePoint({ id: 'h-cue-1', positionMs: 500 })];
      const traktorCues: CuePoint[] = [
        createCuePoint({ id: 't-cue-1', positionMs: 1000 }),
        createCuePoint({ id: 't-cue-2', positionMs: 2000 }),
      ];

      const result = mergeCuePoints(harmonyCues, traktorCues, 'track-1');

      // Smart merge should keep Harmony cues and add non-conflicting Traktor cues
      expect(result.merged).toHaveLength(1); // Harmony has cues, don't replace
      expect(result.hasChanges).toBe(false);
    });

    it('should replace when using REPLACE strategy', () => {
      const harmonyCues: CuePoint[] = [createCuePoint({ id: 'h-cue-1', positionMs: 500 })];
      const traktorCues: CuePoint[] = [createCuePoint({ id: 't-cue-1', positionMs: 1000 })];

      const result = mergeCuePoints(harmonyCues, traktorCues, 'track-1', 'REPLACE');

      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].positionMs).toBe(1000);
      expect(result.hasChanges).toBe(true);
      expect(result.removed).toBe(1);
      expect(result.added).toBe(1);
    });

    it('should assign new trackId to merged cue points', () => {
      const traktorCues: CuePoint[] = [createCuePoint({ id: 'cue-1', trackId: 'old-track-id' })];

      const result = mergeCuePoints([], traktorCues, 'new-track-id');

      expect(result.merged[0].trackId).toBe('new-track-id');
    });

    it('should handle empty Traktor cue points', () => {
      const harmonyCues: CuePoint[] = [createCuePoint({ id: 'h-cue-1' })];
      const traktorCues: CuePoint[] = [];

      const result = mergeCuePoints(harmonyCues, traktorCues, 'track-1');

      expect(result.merged).toHaveLength(1);
      expect(result.hasChanges).toBe(false);
    });

    it('should preserve cue point properties during merge', () => {
      const traktorCues: CuePoint[] = [
        createCuePoint({
          id: 'cue-1',
          type: 'loop' as CueType,
          positionMs: 5000,
          lengthMs: 4000,
          hotcueSlot: 3,
          name: 'My Loop',
          color: '#FF0000',
        }),
      ];

      const result = mergeCuePoints([], traktorCues, 'track-1');

      const merged = result.merged[0];
      expect(merged.type).toBe('loop');
      expect(merged.positionMs).toBe(5000);
      expect(merged.lengthMs).toBe(4000);
      expect(merged.hotcueSlot).toBe(3);
      expect(merged.name).toBe('My Loop');
      expect(merged.color).toBe('#FF0000');
    });
  });
});
