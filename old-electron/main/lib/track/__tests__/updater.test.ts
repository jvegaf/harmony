/**
 * Integration Tests for Update
 *
 * AIDEV-NOTE: These tests verify the complete track update flow including:
 * - Sequential execution of PersistTrack → FetchArtwork → PersistArtwork (race condition fix)
 * - Proper handling of artwork fetch failures
 * - Correct merging of tag metadata into track objects
 *
 * The main fix tested here is that PersistTrack and PersistArtwork are awaited
 * sequentially to prevent race conditions when writing to the same file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Track, ResultTag, Artwork } from '../../../../preload/types/harmony';

// Mock all dependencies before importing the module under test
vi.mock('../saver');
vi.mock('../../artwork/fetcher');
vi.mock('../../artwork/saver');
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import Update from '../updater';
import PersistTrack from '../saver';
import FetchArtwork from '../../artwork/fetcher';
import PersistArtwork from '../../artwork/saver';
import log from 'electron-log';

// Helper to create a minimal track
function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-id',
    path: '/test/path.mp3',
    title: 'Original Title',
    duration: 180,
    ...overrides,
  };
}

// Helper to create a ResultTag
function createResultTag(overrides: Partial<ResultTag> = {}): ResultTag {
  return {
    title: 'Tagged Title',
    artists: ['Tagged Artist'],
    bpm: 128,
    key: 'Am',
    genre: 'Electronic',
    ...overrides,
  };
}

// Helper to create artwork
function createArtwork(): Artwork {
  return {
    mime: 'image/jpeg',
    type: { id: 3 },
    description: 'Front Cover',
    imageBuffer: Buffer.from('fake-image-data'),
  };
}

describe('Update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    vi.mocked(PersistTrack).mockResolvedValue(undefined);
    vi.mocked(FetchArtwork).mockResolvedValue(createArtwork());
    vi.mocked(PersistArtwork).mockResolvedValue(undefined);
  });

  describe('metadata application', () => {
    it('should apply all tag fields to track', async () => {
      const track = createTrack({
        title: 'Original',
        artist: 'Original Artist',
        bpm: 100,
      });
      const tag = createResultTag({
        title: 'New Title',
        artist: 'New Artist',
        artists: ['New Artist'],
        album: 'New Album',
        year: '2024',
        bpm: 140,
        key: 'Gm',
        genre: 'House',
        label: 'Test Label',
      });

      const result = await Update(track, tag);

      expect(result.title).toBe('New Title');
      expect(result.artist).toBe('New Artist');
      expect(result.album).toBe('New Album');
      expect(result.year).toBe(2024);
      expect(result.bpm).toBe(140);
      expect(result.initialKey).toBe('Gm');
      expect(result.genre).toBe('House');
      expect(result.label).toBe('Test Label');
    });

    it('should preserve original track fields when tag fields are empty', async () => {
      const track = createTrack({
        title: 'Original',
        artist: 'Original Artist',
        bpm: 120,
        genre: 'Techno',
      });
      const tag = createResultTag({
        title: 'New Title',
        artists: [],
        artist: undefined,
        bpm: undefined,
        genre: undefined,
      });

      const result = await Update(track, tag);

      expect(result.title).toBe('New Title'); // Updated
      expect(result.artist).toBe(''); // Empty from tag.artists.join()
      expect(result.bpm).toBe(120); // Preserved from original
      expect(result.genre).toBe('Techno'); // Preserved from original
    });

    it('should return original track when tag is null', async () => {
      const track = createTrack();

      const result = await Update(track, null as any);

      expect(result).toBe(track);
      expect(PersistTrack).not.toHaveBeenCalled();
    });

    it('should return original track when tag is undefined', async () => {
      const track = createTrack();

      const result = await Update(track, undefined as any);

      expect(result).toBe(track);
      expect(PersistTrack).not.toHaveBeenCalled();
    });

    it('should join multiple artists with comma', async () => {
      const track = createTrack();
      const tag = createResultTag({
        artist: undefined,
        artists: ['Artist One', 'Artist Two', 'Artist Three'],
      });

      const result = await Update(track, tag);

      expect(result.artist).toBe('Artist One,Artist Two,Artist Three');
    });

    it('should prefer tag.artist over tag.artists if present', async () => {
      const track = createTrack();
      const tag = createResultTag({
        artist: 'Primary Artist',
        artists: ['Secondary Artist'],
      });

      const result = await Update(track, tag);

      expect(result.artist).toBe('Primary Artist');
    });

    it('should convert year string to number', async () => {
      const track = createTrack({ year: 2020 });
      const tag = createResultTag({ year: '2024' });

      const result = await Update(track, tag);

      expect(result.year).toBe(2024);
      expect(typeof result.year).toBe('number');
    });

    it('should preserve original year when tag.year is invalid', async () => {
      const track = createTrack({ year: 2020 });
      const tag = createResultTag({ year: 'invalid' });

      const result = await Update(track, tag);

      expect(result.year).toBe(2020);
    });
  });

  describe('sequential execution (race condition fix)', () => {
    it('should await PersistTrack before fetching artwork', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });
      const callOrder: string[] = [];

      vi.mocked(PersistTrack).mockImplementation(async () => {
        callOrder.push('PersistTrack');
      });
      vi.mocked(FetchArtwork).mockImplementation(async () => {
        callOrder.push('FetchArtwork');
        return createArtwork();
      });
      vi.mocked(PersistArtwork).mockImplementation(async () => {
        callOrder.push('PersistArtwork');
      });

      await Update(track, tag);

      expect(callOrder).toEqual(['PersistTrack', 'FetchArtwork', 'PersistArtwork']);
    });

    it('should not fetch artwork until PersistTrack completes', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });
      let persistTrackCompleted = false;

      vi.mocked(PersistTrack).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        persistTrackCompleted = true;
      });
      vi.mocked(FetchArtwork).mockImplementation(async () => {
        expect(persistTrackCompleted).toBe(true);
        return createArtwork();
      });

      await Update(track, tag);

      expect(PersistTrack).toHaveBeenCalled();
      expect(FetchArtwork).toHaveBeenCalled();
    });

    it('should await PersistArtwork after fetching artwork', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });
      let fetchArtworkCompleted = false;

      vi.mocked(FetchArtwork).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        fetchArtworkCompleted = true;
        return createArtwork();
      });
      vi.mocked(PersistArtwork).mockImplementation(async () => {
        expect(fetchArtworkCompleted).toBe(true);
      });

      await Update(track, tag);

      expect(FetchArtwork).toHaveBeenCalled();
      expect(PersistArtwork).toHaveBeenCalled();
    });
  });

  describe('artwork handling', () => {
    it('should fetch and persist artwork when tag.art is provided', async () => {
      const track = createTrack({ path: '/music/track.mp3' });
      const tag = createResultTag({ art: 'https://beatport.com/cover.jpg' });
      const mockArtwork = createArtwork();

      vi.mocked(FetchArtwork).mockResolvedValueOnce(mockArtwork);

      await Update(track, tag);

      expect(FetchArtwork).toHaveBeenCalledWith('https://beatport.com/cover.jpg');
      expect(PersistArtwork).toHaveBeenCalledWith('/music/track.mp3', mockArtwork);
    });

    it('should skip artwork when tag.art is null', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: null });

      await Update(track, tag);

      expect(FetchArtwork).not.toHaveBeenCalled();
      expect(PersistArtwork).not.toHaveBeenCalled();
    });

    it('should skip artwork when tag.art is undefined', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: undefined });

      await Update(track, tag);

      expect(FetchArtwork).not.toHaveBeenCalled();
      expect(PersistArtwork).not.toHaveBeenCalled();
    });

    it('should skip artwork when tag.art is empty string', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: '' });

      await Update(track, tag);

      expect(FetchArtwork).not.toHaveBeenCalled();
      expect(PersistArtwork).not.toHaveBeenCalled();
    });

    it('should handle FetchArtwork returning null gracefully', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://broken-link.com/cover.jpg' });

      vi.mocked(FetchArtwork).mockResolvedValueOnce(null);

      const result = await Update(track, tag);

      expect(FetchArtwork).toHaveBeenCalled();
      expect(PersistArtwork).not.toHaveBeenCalled();
      expect(log.warn).toHaveBeenCalledWith('Failed to fetch artwork from: https://broken-link.com/cover.jpg');
      expect(result).toBeDefined();
      expect(result.title).toBe('Tagged Title'); // Metadata still applied
    });

    it('should log artwork URL from tag', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });

      await Update(track, tag);

      expect(log.info).toHaveBeenCalledWith('art: https://example.com/cover.jpg');
    });

    it('should log when tag.art is undefined', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: undefined });

      await Update(track, tag);

      expect(log.info).toHaveBeenCalledWith('art: undefined');
    });
  });

  describe('error handling', () => {
    it('should log error and still return track on PersistTrack failure', async () => {
      const track = createTrack();
      const tag = createResultTag();
      const mockError = new Error('Failed to write ID3 tags');

      vi.mocked(PersistTrack).mockRejectedValueOnce(mockError);

      const result = await Update(track, tag);

      expect(log.error).toHaveBeenCalledWith('update error: ', mockError);
      expect(result).toBeDefined();
      expect(result.title).toBe('Tagged Title');
    });

    it('should log error and still return track on FetchArtwork failure', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });
      const mockError = new Error('Network error');

      vi.mocked(FetchArtwork).mockRejectedValueOnce(mockError);

      const result = await Update(track, tag);

      expect(log.error).toHaveBeenCalledWith('update error: ', mockError);
      expect(result).toBeDefined();
    });

    it('should log error and still return track on PersistArtwork failure', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });
      const mockError = new Error('Failed to write artwork');

      vi.mocked(PersistArtwork).mockRejectedValueOnce(mockError);

      const result = await Update(track, tag);

      expect(log.error).toHaveBeenCalledWith('update error: ', mockError);
      expect(result).toBeDefined();
    });

    it('should not call PersistArtwork if FetchArtwork throws', async () => {
      const track = createTrack();
      const tag = createResultTag({ art: 'https://example.com/cover.jpg' });

      vi.mocked(FetchArtwork).mockRejectedValueOnce(new Error('Network error'));

      await Update(track, tag);

      expect(FetchArtwork).toHaveBeenCalled();
      expect(PersistArtwork).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should apply Beatport tags with artwork (full flow)', async () => {
      const track = createTrack({
        title: 'Unknown',
        artist: 'Unknown',
        bpm: undefined,
      });
      const tag = createResultTag({
        title: 'Beatport Track',
        artist: 'Beatport Artist',
        artists: ['Beatport Artist'],
        album: 'Beatport Release',
        year: '2024',
        bpm: 128,
        key: 'Gm',
        genre: 'Techno',
        label: 'Beatport Label',
        art: 'https://geo-media.beatport.com/image_size/500x500/abc.jpg',
      });

      const result = await Update(track, tag);

      expect(result.title).toBe('Beatport Track');
      expect(result.artist).toBe('Beatport Artist');
      expect(result.bpm).toBe(128);
      expect(PersistTrack).toHaveBeenCalled();
      expect(FetchArtwork).toHaveBeenCalledWith('https://geo-media.beatport.com/image_size/500x500/abc.jpg');
      expect(PersistArtwork).toHaveBeenCalled();
    });

    it('should apply Traxsource tags with artwork', async () => {
      const track = createTrack();
      const tag = createResultTag({
        title: 'Traxsource Track',
        art: 'https://geo-media.traxsource.com/image/500x500/123.jpg',
      });

      await Update(track, tag);

      expect(FetchArtwork).toHaveBeenCalledWith('https://geo-media.traxsource.com/image/500x500/123.jpg');
    });

    it('should apply Bandcamp tags without artwork gracefully', async () => {
      const track = createTrack();
      const tag = createResultTag({
        title: 'Bandcamp Track',
        art: undefined, // Bandcamp might not have artwork
      });

      const result = await Update(track, tag);

      expect(result.title).toBe('Bandcamp Track');
      expect(FetchArtwork).not.toHaveBeenCalled();
      expect(PersistArtwork).not.toHaveBeenCalled();
    });
  });
});
