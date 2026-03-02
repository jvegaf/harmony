/**
 * Tests for FetchArtwork
 *
 * AIDEV-NOTE: These tests verify that artwork is correctly downloaded from URLs
 * (typically from Beatport, Traxsource, or Bandcamp) and converted to the Artwork
 * format expected by node-id3.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing the module under test
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
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

import axios from 'axios';
import FetchArtwork from '../fetcher';

describe('FetchArtwork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful downloads', () => {
    it('should download image and return Artwork object', async () => {
      const mockImageData = Buffer.from('fake-jpeg-data');
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: mockImageData,
        headers: {
          'content-type': 'image/jpeg',
        },
      });

      const artwork = await FetchArtwork('https://example.com/cover.jpg');

      expect(artwork).not.toBeNull();
      expect(artwork?.mime).toBe('image/jpeg');
      expect(artwork?.imageBuffer).toEqual(mockImageData);
      expect(artwork?.type.id).toBe(3);
      expect(artwork?.description).toBe('Front Cover');
    });

    it('should set mime from response content-type header', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('png-data'),
        headers: {
          'content-type': 'image/png',
        },
      });

      const artwork = await FetchArtwork('https://example.com/cover.png');

      expect(artwork?.mime).toBe('image/png');
    });

    it('should handle content-type with charset', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('data'),
        headers: {
          'content-type': 'image/webp; charset=utf-8',
        },
      });

      const artwork = await FetchArtwork('https://example.com/cover.webp');

      expect(artwork?.mime).toBe('image/webp; charset=utf-8');
    });

    it('should default to empty mime if content-type is missing', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('data'),
        headers: {},
      });

      const artwork = await FetchArtwork('https://example.com/cover.jpg');

      expect(artwork?.mime).toBe('');
    });

    it('should set type.id to 3 (Front Cover)', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('data'),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://example.com/cover.jpg');

      expect(artwork?.type.id).toBe(3);
    });

    it('should set description to "Front Cover"', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('data'),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://example.com/cover.jpg');

      expect(artwork?.description).toBe('Front Cover');
    });

    it('should call axios with responseType arraybuffer', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('data'),
        headers: { 'content-type': 'image/jpeg' },
      });

      await FetchArtwork('https://example.com/cover.jpg');

      expect(axios.get).toHaveBeenCalledWith('https://example.com/cover.jpg', {
        responseType: 'arraybuffer',
      });
    });
  });

  describe('different image types', () => {
    it('should handle JPEG images', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('jpeg-data'),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://beatport.com/image/500x500.jpg');

      expect(artwork?.mime).toBe('image/jpeg');
    });

    it('should handle PNG images', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('png-data'),
        headers: { 'content-type': 'image/png' },
      });

      const artwork = await FetchArtwork('https://traxsource.com/cover.png');

      expect(artwork?.mime).toBe('image/png');
    });

    it('should handle WebP images', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('webp-data'),
        headers: { 'content-type': 'image/webp' },
      });

      const artwork = await FetchArtwork('https://bandcamp.com/artwork.webp');

      expect(artwork?.mime).toBe('image/webp');
    });
  });

  describe('error handling', () => {
    it('should return null on network error', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      const artwork = await FetchArtwork('https://example.com/cover.jpg');

      expect(artwork).toBeNull();
    });

    it('should return null on 404 Not Found', async () => {
      const error = new Error('Request failed with status code 404');
      vi.mocked(axios.get).mockRejectedValueOnce(error);

      const artwork = await FetchArtwork('https://example.com/missing.jpg');

      expect(artwork).toBeNull();
    });

    it('should return null on timeout', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('timeout'));

      const artwork = await FetchArtwork('https://slow-server.com/cover.jpg');

      expect(artwork).toBeNull();
    });

    it('should return null on invalid URL', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Invalid URL'));

      const artwork = await FetchArtwork('not-a-valid-url');

      expect(artwork).toBeNull();
    });
  });

  describe('real-world URLs', () => {
    it('should handle Beatport dynamic image URLs', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('beatport-image'),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://geo-media.beatport.com/image_size/500x500/abc123.jpg');

      expect(artwork).not.toBeNull();
      expect(artwork?.mime).toBe('image/jpeg');
    });

    it('should handle Traxsource artwork URLs', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('traxsource-image'),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://geo-media.traxsource.com/image/500x500/12345.jpg');

      expect(artwork).not.toBeNull();
    });

    it('should handle Bandcamp artwork URLs', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from('bandcamp-image'),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://f4.bcbits.com/img/a1234567890_16.jpg');

      expect(artwork).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty response data', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from(''),
        headers: { 'content-type': 'image/jpeg' },
      });

      const artwork = await FetchArtwork('https://example.com/empty.jpg');

      expect(artwork?.imageBuffer).toEqual(Buffer.from(''));
    });

    it('should handle very large images', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: largeBuffer,
        headers: { 'content-type': 'image/png' },
      });

      const artwork = await FetchArtwork('https://example.com/large.png');

      expect(artwork?.imageBuffer.length).toBe(10 * 1024 * 1024);
    });
  });
});
