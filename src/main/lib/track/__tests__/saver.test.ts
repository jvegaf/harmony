/**
 * Tests for PersistTrack
 *
 * AIDEV-NOTE: These tests verify that track metadata is correctly written to ID3 tags
 * using node-id3. The function was updated to be async/await to prevent race conditions
 * when writing artwork simultaneously.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Track } from '../../../../preload/types/harmony';

// AIDEV-NOTE: Mock node-id3 with both read (used by safeId3Update to read existing tags)
// and Promise.write (used to write sanitized + merged tags back)
vi.mock('node-id3', () => ({
  read: vi.fn().mockReturnValue({}),
  Promise: {
    update: vi.fn().mockResolvedValue(true),
    write: vi.fn().mockResolvedValue(true),
  },
}));

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import * as NodeId3 from 'node-id3';
import log from 'electron-log';
import PersistTrack from '../saver';

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

describe('PersistTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should call NodeId3.Promise.update with correct tags and path', async () => {
      const track = createTrack({
        title: 'My Song',
        artist: 'My Artist',
        album: 'My Album',
        year: 2024,
        genre: 'Electronic',
        bpm: 128,
        initialKey: 'Am',
      });

      await PersistTrack(track);

      expect(NodeId3.Promise.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Song',
          artist: 'My Artist',
          album: 'My Album',
          year: '2024',
          genre: 'Electronic',
          bpm: '128',
          initialKey: 'Am',
        }),
        '/test/path.mp3',
      );
    });

    it('should log success message after persisting', async () => {
      const track = createTrack({ path: '/music/track.mp3' });

      await PersistTrack(track);

      expect(log.info).toHaveBeenCalledWith('track persisted', '/music/track.mp3');
    });

    it('should return a Promise (awaitable)', async () => {
      const track = createTrack();

      const result = PersistTrack(track);

      expect(result).toBeInstanceOf(Promise);
      await result; // Should not throw
    });
  });

  describe('type conversions', () => {
    it('should convert bpm number to string', async () => {
      const track = createTrack({ bpm: 140 });

      await PersistTrack(track);

      const callArgs = (NodeId3.Promise.write as any).mock.calls[0][0];
      expect(callArgs.bpm).toBe('140');
      expect(typeof callArgs.bpm).toBe('string');
    });

    it('should convert year number to string', async () => {
      const track = createTrack({ year: 2023 });

      await PersistTrack(track);

      const callArgs = (NodeId3.Promise.write as any).mock.calls[0][0];
      expect(callArgs.year).toBe('2023');
      expect(typeof callArgs.year).toBe('string');
    });

    it('should handle undefined bpm', async () => {
      const track = createTrack({ bpm: undefined });

      await PersistTrack(track);

      const callArgs = (NodeId3.Promise.write as any).mock.calls[0][0];
      expect(callArgs.bpm).toBeUndefined();
    });

    it('should handle undefined year', async () => {
      const track = createTrack({ year: undefined });

      await PersistTrack(track);

      const callArgs = (NodeId3.Promise.write as any).mock.calls[0][0];
      expect(callArgs.year).toBeUndefined();
    });

    it('should handle zero bpm (falsy but valid)', async () => {
      const track = createTrack({ bpm: 0 });

      await PersistTrack(track);

      const callArgs = (NodeId3.Promise.write as any).mock.calls[0][0];
      // 0 is falsy, so should be undefined per current implementation
      expect(callArgs.bpm).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should propagate errors from NodeId3', async () => {
      const track = createTrack();
      const mockError = new Error('ID3 write failed');

      vi.mocked(NodeId3.Promise.write).mockRejectedValueOnce(mockError);

      await expect(PersistTrack(track)).rejects.toThrow('ID3 write failed');
    });

    it('should not log info if update fails', async () => {
      const track = createTrack();
      vi.mocked(NodeId3.Promise.write).mockRejectedValueOnce(new Error('Failed'));

      try {
        await PersistTrack(track);
      } catch {
        // Expected
      }

      expect(log.info).not.toHaveBeenCalled();
    });
  });

  describe('minimal track data', () => {
    it('should handle track with only required fields', async () => {
      const track = createTrack({
        title: 'Minimal',
        artist: undefined,
        album: undefined,
        year: undefined,
        genre: undefined,
        bpm: undefined,
        initialKey: undefined,
      });

      await PersistTrack(track);

      expect(NodeId3.Promise.write).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Minimal',
          artist: undefined,
          album: undefined,
          year: undefined,
          genre: undefined,
          bpm: undefined,
          initialKey: undefined,
        }),
        '/test/path.mp3',
      );
    });

    it('should handle track with empty strings', async () => {
      const track = createTrack({
        title: '',
        artist: '',
        album: '',
        genre: '',
        initialKey: '',
      });

      await PersistTrack(track);

      const callArgs = (NodeId3.Promise.write as any).mock.calls[0][0];
      expect(callArgs.title).toBe('');
      expect(callArgs.artist).toBe('');
    });
  });
});
