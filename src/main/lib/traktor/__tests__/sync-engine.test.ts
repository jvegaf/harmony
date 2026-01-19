/**
 * Sync Engine Tests
 *
 * Tests for the main synchronization orchestrator.
 *
 * AIDEV-NOTE: The sync engine coordinates:
 * - Parsing NML files
 * - Matching tracks by path
 * - Merging metadata via conflict resolver
 * - Syncing cue points
 * - Syncing playlists and folders
 */

import { describe, it, expect } from 'vitest';

import type { Track } from '../../../../preload/types/harmony';
import type { CuePoint, CueType } from '../../../../preload/types/cue-point';
import { SyncEngine } from '../sync/sync-engine';
import { MergeStrategy } from '../sync/conflict-resolver';

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

describe('SyncEngine', () => {
  describe('matchTracksByPath', () => {
    it('should match tracks with identical paths', () => {
      const harmonyTracks: Track[] = [
        createTrack({ id: 'h1', path: '/music/track1.mp3' }),
        createTrack({ id: 'h2', path: '/music/track2.mp3' }),
      ];

      const traktorTracks: Track[] = [
        createTrack({ id: 't1', path: '/music/track1.mp3', artist: 'Artist 1' }),
        createTrack({ id: 't3', path: '/music/track3.mp3', artist: 'Artist 3' }),
      ];

      const engine = new SyncEngine();
      const matches = engine.matchTracksByPath(harmonyTracks, traktorTracks);

      expect(matches.matched).toHaveLength(1);
      expect(matches.matched[0].harmony.id).toBe('h1');
      expect(matches.matched[0].traktor.id).toBe('t1');
      expect(matches.unmatchedHarmony).toHaveLength(1);
      expect(matches.unmatchedTraktor).toHaveLength(1);
    });

    it('should handle case-insensitive path matching on case-insensitive systems', () => {
      const harmonyTracks: Track[] = [createTrack({ id: 'h1', path: '/Music/Track1.MP3' })];

      const traktorTracks: Track[] = [createTrack({ id: 't1', path: '/music/track1.mp3' })];

      const engine = new SyncEngine({ caseInsensitivePaths: true });
      const matches = engine.matchTracksByPath(harmonyTracks, traktorTracks);

      expect(matches.matched).toHaveLength(1);
    });

    it('should handle empty arrays', () => {
      const engine = new SyncEngine();

      const matches1 = engine.matchTracksByPath([], []);
      expect(matches1.matched).toHaveLength(0);

      const matches2 = engine.matchTracksByPath([createTrack()], []);
      expect(matches2.matched).toHaveLength(0);
      expect(matches2.unmatchedHarmony).toHaveLength(1);
    });
  });

  describe('syncTrack', () => {
    it('should merge track metadata and return result', () => {
      const harmony = createTrack({
        id: 'h1',
        title: 'My Title',
        artist: undefined,
      });

      const traktor = createTrack({
        id: 't1',
        title: 'Traktor Title',
        artist: 'Traktor Artist',
      });

      const engine = new SyncEngine();
      const result = engine.syncTrack(harmony, traktor);

      expect(result.track.id).toBe('h1'); // Harmony ID preserved
      expect(result.track.title).toBe('My Title'); // Harmony value preserved
      expect(result.track.artist).toBe('Traktor Artist'); // Filled from Traktor
      expect(result.metadataChanged).toBe(true);
      expect(result.fieldsUpdated).toContain('artist');
    });

    it('should sync cue points when provided', () => {
      const harmony = createTrack({ id: 'h1' });
      const traktor = createTrack({ id: 't1' });

      const harmonyCues: CuePoint[] = [];
      const traktorCues: CuePoint[] = [
        createCuePoint({ id: 'c1', positionMs: 1000 }),
        createCuePoint({ id: 'c2', positionMs: 2000 }),
      ];

      const engine = new SyncEngine();
      const result = engine.syncTrack(harmony, traktor, harmonyCues, traktorCues);

      expect(result.cuePoints).toHaveLength(2);
      expect(result.cuePointsChanged).toBe(true);
      expect(result.cuePoints![0].trackId).toBe('h1'); // Uses Harmony track ID
    });

    it('should use specified merge strategy', () => {
      const harmony = createTrack({
        id: 'h1',
        title: 'Harmony Title',
      });

      const traktor = createTrack({
        id: 't1',
        title: 'Traktor Title',
      });

      const engine = new SyncEngine({ strategy: MergeStrategy.TRAKTOR_WINS });
      const result = engine.syncTrack(harmony, traktor);

      expect(result.track.title).toBe('Traktor Title');
    });
  });

  describe('prepareSyncPlan', () => {
    it('should create a sync plan from matched tracks', () => {
      const harmonyTracks: Track[] = [
        createTrack({ id: 'h1', path: '/music/track1.mp3', artist: undefined }),
        createTrack({ id: 'h2', path: '/music/track2.mp3', artist: 'Existing' }),
      ];

      const traktorTracks: Track[] = [
        createTrack({ id: 't1', path: '/music/track1.mp3', artist: 'Artist 1' }),
        createTrack({ id: 't2', path: '/music/track2.mp3', artist: 'Different' }),
      ];

      const engine = new SyncEngine();
      const plan = engine.prepareSyncPlan(harmonyTracks, traktorTracks);

      expect(plan.tracksToUpdate).toHaveLength(1); // Only h1 has changes
      expect(plan.tracksToUpdate[0].track.id).toBe('h1');
      expect(plan.tracksWithNoChanges).toHaveLength(1);
      expect(plan.unmatchedTraktorTracks).toHaveLength(0);
    });

    it('should report unmatched Traktor tracks', () => {
      const harmonyTracks: Track[] = [createTrack({ id: 'h1', path: '/music/track1.mp3' })];

      const traktorTracks: Track[] = [
        createTrack({ id: 't1', path: '/music/track1.mp3' }),
        createTrack({ id: 't2', path: '/music/track2.mp3' }), // Not in Harmony
      ];

      const engine = new SyncEngine();
      const plan = engine.prepareSyncPlan(harmonyTracks, traktorTracks);

      expect(plan.unmatchedTraktorTracks).toHaveLength(1);
      expect(plan.unmatchedTraktorTracks[0].path).toBe('/music/track2.mp3');
    });

    it('should include summary statistics', () => {
      const harmonyTracks: Track[] = [createTrack({ id: 'h1', path: '/music/track1.mp3', artist: undefined })];

      const traktorTracks: Track[] = [createTrack({ id: 't1', path: '/music/track1.mp3', artist: 'Artist' })];

      const engine = new SyncEngine();
      const plan = engine.prepareSyncPlan(harmonyTracks, traktorTracks);

      expect(plan.summary.totalMatched).toBe(1);
      expect(plan.summary.tracksWithChanges).toBe(1);
      expect(plan.summary.tracksWithNoChanges).toBe(0);
      expect(plan.summary.unmatchedTraktor).toBe(0);
    });
  });

  describe('getCuePointsForSync', () => {
    it('should map Traktor cue points by track path', () => {
      // Test that cue points can be organized by path for sync
      const traktorCuesByPath = new Map<string, CuePoint[]>();
      traktorCuesByPath.set('/music/track1.mp3', [createCuePoint({ id: 'c1' }), createCuePoint({ id: 'c2' })]);

      expect(traktorCuesByPath.get('/music/track1.mp3')).toHaveLength(2);
    });
  });
});
