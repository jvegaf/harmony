/**
 * Tests for PersistArtwork
 *
 * AIDEV-NOTE: These tests verify that artwork is correctly written to ID3 tags.
 * The function was updated to be async/await to prevent race conditions when
 * writing metadata and artwork to the same file simultaneously.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Artwork } from '../../../../preload/types/harmony';

// Mock node-id3 before importing the module under test
vi.mock('node-id3', () => ({
  Promise: {
    update: vi.fn().mockResolvedValue(true),
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
import PersistArtwork from '../saver';

// Helper to create artwork
function createArtwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    mime: 'image/jpeg',
    type: { id: 3 },
    description: 'Front Cover',
    imageBuffer: Buffer.from('fake-image-data'),
    ...overrides,
  };
}

describe('PersistArtwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should call NodeId3.Promise.update with artwork as image tag', async () => {
      const artwork = createArtwork();
      const trackPath = '/music/track.mp3';

      await PersistArtwork(trackPath, artwork);

      expect(NodeId3.Promise.update).toHaveBeenCalledWith(
        {
          image: artwork,
        },
        trackPath,
      );
    });

    it('should log success message after persisting', async () => {
      const artwork = createArtwork();
      const trackPath = '/music/track.mp3';

      await PersistArtwork(trackPath, artwork);

      expect(log.info).toHaveBeenCalledWith('artwork persisted', trackPath);
    });

    it('should return a Promise (awaitable)', async () => {
      const artwork = createArtwork();
      const trackPath = '/music/track.mp3';

      const result = PersistArtwork(trackPath, artwork);

      expect(result).toBeInstanceOf(Promise);
      await result; // Should not throw
    });
  });

  describe('artwork variants', () => {
    it('should handle PNG artwork', async () => {
      const artwork = createArtwork({
        mime: 'image/png',
        imageBuffer: Buffer.from('png-data'),
      });

      await PersistArtwork('/test.mp3', artwork);

      const callArgs = (NodeId3.Promise.update as any).mock.calls[0][0];
      expect(callArgs.image.mime).toBe('image/png');
    });

    it('should handle artwork without description', async () => {
      const artwork = createArtwork({ description: undefined });

      await PersistArtwork('/test.mp3', artwork);

      const callArgs = (NodeId3.Promise.update as any).mock.calls[0][0];
      expect(callArgs.image.description).toBeUndefined();
    });

    it('should handle large artwork buffers', async () => {
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const artwork = createArtwork({ imageBuffer: largeBuffer });

      await PersistArtwork('/test.mp3', artwork);

      const callArgs = (NodeId3.Promise.update as any).mock.calls[0][0];
      expect(callArgs.image.imageBuffer).toBe(largeBuffer);
    });

    it('should preserve all artwork properties', async () => {
      const artwork = createArtwork({
        mime: 'image/webp',
        type: { id: 3 },
        description: 'Custom Cover',
        imageBuffer: Buffer.from('custom-data'),
      });

      await PersistArtwork('/test.mp3', artwork);

      const callArgs = (NodeId3.Promise.update as any).mock.calls[0][0];
      expect(callArgs.image).toEqual(artwork);
    });
  });

  describe('different file paths', () => {
    it('should handle Windows-style paths', async () => {
      const artwork = createArtwork();
      const windowsPath = 'C:\\Users\\Music\\track.mp3';

      await PersistArtwork(windowsPath, artwork);

      expect(NodeId3.Promise.update).toHaveBeenCalledWith(expect.anything(), windowsPath);
    });

    it('should handle Unix-style paths', async () => {
      const artwork = createArtwork();
      const unixPath = '/home/user/music/track.mp3';

      await PersistArtwork(unixPath, artwork);

      expect(NodeId3.Promise.update).toHaveBeenCalledWith(expect.anything(), unixPath);
    });

    it('should handle paths with spaces', async () => {
      const artwork = createArtwork();
      const pathWithSpaces = '/music/My Folder/My Track.mp3';

      await PersistArtwork(pathWithSpaces, artwork);

      expect(NodeId3.Promise.update).toHaveBeenCalledWith(expect.anything(), pathWithSpaces);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from NodeId3', async () => {
      const artwork = createArtwork();
      const mockError = new Error('ID3 write failed');

      vi.mocked(NodeId3.Promise.update).mockRejectedValueOnce(mockError);

      await expect(PersistArtwork('/test.mp3', artwork)).rejects.toThrow('ID3 write failed');
    });

    it('should not log info if update fails', async () => {
      const artwork = createArtwork();
      vi.mocked(NodeId3.Promise.update).mockRejectedValueOnce(new Error('Failed'));

      try {
        await PersistArtwork('/test.mp3', artwork);
      } catch {
        // Expected
      }

      expect(log.info).not.toHaveBeenCalled();
    });

    it('should handle file permission errors', async () => {
      const artwork = createArtwork();
      const permissionError = new Error('EACCES: permission denied');

      vi.mocked(NodeId3.Promise.update).mockRejectedValueOnce(permissionError);

      await expect(PersistArtwork('/test.mp3', artwork)).rejects.toThrow('EACCES: permission denied');
    });
  });
});
