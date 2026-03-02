/**
 * Track Merge Tests
 *
 * TDD tests for smart merging tracks during import deduplication.
 *
 * AIDEV-NOTE: Smart merge fills empty fields in existing track with
 * data from incoming track, never overwrites non-empty values.
 */

import { describe, it, expect } from 'vitest';
import type { Track } from '../../../preload/types/harmony';
import { smartMergeTrack, deduplicateAndMergeTracks } from '../track-merge';

// Helper to create a minimal track for testing
function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-id',
    path: '/test/path.mp3',
    title: 'Test Track',
    duration: 180,
    ...overrides,
  };
}

describe('smartMergeTrack', () => {
  it('should fill empty artist from incoming track', () => {
    const existing = createTrack({ id: 'existing-1', artist: undefined });
    const incoming = createTrack({ id: 'incoming-1', artist: 'New Artist' });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.artist).toBe('New Artist');
    expect(result.hasChanges).toBe(true);
  });

  it('should NOT overwrite existing artist', () => {
    const existing = createTrack({ id: 'existing-1', artist: 'Original Artist' });
    const incoming = createTrack({ id: 'incoming-1', artist: 'New Artist' });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.artist).toBe('Original Artist');
    expect(result.hasChanges).toBe(false);
  });

  it('should preserve existing track ID', () => {
    const existing = createTrack({ id: 'existing-id-123' });
    const incoming = createTrack({ id: 'incoming-id-456' });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.id).toBe('existing-id-123');
  });

  it('should preserve existing track path', () => {
    const existing = createTrack({ path: '/original/path.mp3' });
    const incoming = createTrack({ path: '/new/path.mp3' });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.path).toBe('/original/path.mp3');
  });

  it('should merge multiple empty fields at once', () => {
    const existing = createTrack({
      id: 'existing-1',
      artist: undefined,
      album: undefined,
      genre: undefined,
      year: undefined,
    });
    const incoming = createTrack({
      id: 'incoming-1',
      artist: 'Artist',
      album: 'Album',
      genre: 'Genre',
      year: 2024,
    });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.artist).toBe('Artist');
    expect(result.track.album).toBe('Album');
    expect(result.track.genre).toBe('Genre');
    expect(result.track.year).toBe(2024);
    expect(result.hasChanges).toBe(true);
  });

  it('should report no changes when nothing to merge', () => {
    const existing = createTrack({
      artist: 'Original Artist',
      album: 'Original Album',
    });
    const incoming = createTrack({
      artist: 'New Artist',
      album: 'New Album',
    });

    const result = smartMergeTrack(existing, incoming);

    expect(result.hasChanges).toBe(false);
  });

  it('should handle rating merge correctly', () => {
    const existing = createTrack({
      rating: undefined,
    });
    const incoming = createTrack({
      rating: { rating: 4, source: 'traktor' },
    });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.rating).toEqual({ rating: 4, source: 'traktor' });
    expect(result.hasChanges).toBe(true);
  });

  it('should NOT overwrite existing rating', () => {
    const existing = createTrack({
      rating: { rating: 5, source: 'user' },
    });
    const incoming = createTrack({
      rating: { rating: 3, source: 'traktor' },
    });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.rating).toEqual({ rating: 5, source: 'user' });
    expect(result.hasChanges).toBe(false);
  });

  it('should treat empty string as non-empty value', () => {
    const existing = createTrack({ comment: '' });
    const incoming = createTrack({ comment: 'New comment' });

    const result = smartMergeTrack(existing, incoming);

    // Empty string should be preserved, not overwritten
    expect(result.track.comment).toBe('');
    expect(result.hasChanges).toBe(false);
  });

  it('should merge BPM when missing', () => {
    const existing = createTrack({ bpm: undefined });
    const incoming = createTrack({ bpm: 128 });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.bpm).toBe(128);
    expect(result.hasChanges).toBe(true);
  });

  it('should merge initialKey when missing', () => {
    const existing = createTrack({ initialKey: undefined });
    const incoming = createTrack({ initialKey: 'Am' });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.initialKey).toBe('Am');
    expect(result.hasChanges).toBe(true);
  });

  it('should merge bitrate when missing', () => {
    const existing = createTrack({ bitrate: undefined });
    const incoming = createTrack({ bitrate: 320 });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.bitrate).toBe(320);
    expect(result.hasChanges).toBe(true);
  });

  it('should merge label when missing', () => {
    const existing = createTrack({ label: undefined });
    const incoming = createTrack({ label: 'Test Label' });

    const result = smartMergeTrack(existing, incoming);

    expect(result.track.label).toBe('Test Label');
    expect(result.hasChanges).toBe(true);
  });
});

describe('deduplicateAndMergeTracks', () => {
  it('should identify new tracks (not in existing)', () => {
    const existing = [createTrack({ id: '1', path: '/a.mp3' }), createTrack({ id: '2', path: '/b.mp3' })];
    const incoming = [
      createTrack({ id: '3', path: '/a.mp3' }), // duplicate by path
      createTrack({ id: '4', path: '/c.mp3' }), // new
      createTrack({ id: '5', path: '/d.mp3' }), // new
    ];

    const result = deduplicateAndMergeTracks(existing, incoming);

    expect(result.newTracks).toHaveLength(2);
    expect(result.newTracks.map(t => t.path)).toContain('/c.mp3');
    expect(result.newTracks.map(t => t.path)).toContain('/d.mp3');
  });

  it('should smart merge duplicates with empty fields', () => {
    const existing = [createTrack({ id: 'ex-1', path: '/a.mp3', artist: undefined, album: 'Album' })];
    const incoming = [createTrack({ id: 'in-1', path: '/a.mp3', artist: 'Artist', album: 'Different Album' })];

    const result = deduplicateAndMergeTracks(existing, incoming);

    expect(result.newTracks).toHaveLength(0);
    expect(result.tracksToUpdate).toHaveLength(1);
    expect(result.tracksToUpdate[0].artist).toBe('Artist');
    expect(result.tracksToUpdate[0].album).toBe('Album'); // preserved
    expect(result.tracksToUpdate[0].id).toBe('ex-1'); // preserved existing ID
  });

  it('should handle case-insensitive paths on Windows', () => {
    const existing = [createTrack({ id: 'ex-1', path: '/Music/Track.mp3' })];
    const incoming = [createTrack({ id: 'in-1', path: '/music/track.mp3' })];

    const result = deduplicateAndMergeTracks(existing, incoming, true);

    // Should recognize as duplicate despite case difference
    expect(result.newTracks).toHaveLength(0);
    expect(result.tracksToUpdate).toHaveLength(0); // no changes
  });

  it('should handle case-sensitive paths on Linux', () => {
    const existing = [createTrack({ id: 'ex-1', path: '/Music/Track.mp3' })];
    const incoming = [createTrack({ id: 'in-1', path: '/music/track.mp3' })];

    const result = deduplicateAndMergeTracks(existing, incoming, false);

    // Should NOT recognize as duplicate (case-sensitive)
    expect(result.newTracks).toHaveLength(1);
    expect(result.tracksToUpdate).toHaveLength(0);
  });

  it('should not report update when no fields changed', () => {
    const existing = [createTrack({ id: 'ex-1', path: '/a.mp3', artist: 'Artist', album: 'Album' })];
    const incoming = [createTrack({ id: 'in-1', path: '/a.mp3', artist: 'Different', album: 'Different' })];

    const result = deduplicateAndMergeTracks(existing, incoming);

    expect(result.tracksToUpdate).toHaveLength(0);
    expect(result.newTracks).toHaveLength(0);
  });

  it('should handle empty existing tracks array', () => {
    const existing: Track[] = [];
    const incoming = [createTrack({ id: '1', path: '/a.mp3' }), createTrack({ id: '2', path: '/b.mp3' })];

    const result = deduplicateAndMergeTracks(existing, incoming);

    expect(result.newTracks).toHaveLength(2);
    expect(result.tracksToUpdate).toHaveLength(0);
  });

  it('should handle empty incoming tracks array', () => {
    const existing = [createTrack({ id: '1', path: '/a.mp3' })];
    const incoming: Track[] = [];

    const result = deduplicateAndMergeTracks(existing, incoming);

    expect(result.newTracks).toHaveLength(0);
    expect(result.tracksToUpdate).toHaveLength(0);
  });

  it('should handle multiple duplicates with partial merges', () => {
    const existing = [
      createTrack({ id: 'ex-1', path: '/a.mp3', artist: undefined }),
      createTrack({ id: 'ex-2', path: '/b.mp3', album: undefined }),
    ];
    const incoming = [
      createTrack({ id: 'in-1', path: '/a.mp3', artist: 'Artist A' }),
      createTrack({ id: 'in-2', path: '/b.mp3', album: 'Album B' }),
      createTrack({ id: 'in-3', path: '/c.mp3' }),
    ];

    const result = deduplicateAndMergeTracks(existing, incoming);

    expect(result.newTracks).toHaveLength(1);
    expect(result.tracksToUpdate).toHaveLength(2);
    expect(result.tracksToUpdate.find(t => t.path === '/a.mp3')?.artist).toBe('Artist A');
    expect(result.tracksToUpdate.find(t => t.path === '/b.mp3')?.album).toBe('Album B');
  });
});
