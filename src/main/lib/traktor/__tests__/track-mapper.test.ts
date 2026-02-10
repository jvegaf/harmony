/**
 * Track Mapper Tests
 *
 * TDD tests for mapping Traktor entries to Harmony tracks and vice versa.
 * Uses real data from the collection.nml fixture.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';

import { TraktorNMLParser } from '../nml-parser';
import {
  mapTraktorEntryToTrack,
  mapTraktorPathToSystem,
  mapSystemPathToTraktor,
  mapTraktorRating,
  mapHarmonyRatingToTraktor,
  mapTraktorBpm,
  parseTraktorDate,
} from '../mappers/track-mapper';
import type { TraktorEntry } from '../types/nml-types';
import type { Track } from '../../../../preload/types/harmony';

const FIXTURE_PATH = resolve(__dirname, 'fixtures/collection.nml');

describe('Track Mapper', () => {
  describe('mapTraktorPathToSystem()', () => {
    it('should convert Traktor path format to system path (Linux/Unix)', () => {
      const traktorDir = '/:Users/:josev/:Music/:BOX/:2601/:';
      const traktorFile = 'test.mp3';

      // Without volume, produces Unix-style path
      const result = mapTraktorPathToSystem(traktorDir, traktorFile);
      expect(result).toMatch(/Users[/\\]josev[/\\]Music[/\\]BOX[/\\]2601[/\\]test\.mp3$/);
    });

    it('should convert Traktor path with VOLUME to Windows path', () => {
      const traktorDir = '/:Users/:josev/:Music/:BOX/:2601/:';
      const traktorFile = 'test.mp3';
      const volume = 'C:';

      // With volume, produces OS-native path (Windows: C:\..., Unix: C:/...)
      const result = mapTraktorPathToSystem(traktorDir, traktorFile, volume);
      // On Windows: C:\Users\josev\..., On Unix: C:/Users/josev/...
      expect(result).toMatch(/^C:[/\\]Users[/\\]josev[/\\]Music[/\\]BOX[/\\]2601[/\\]test\.mp3$/);
    });

    it('should handle paths with special characters', () => {
      const traktorDir = '/:Users/:josev/:Music/:My Songs/:';
      const traktorFile = 'Track & Beat.mp3';

      const result = mapTraktorPathToSystem(traktorDir, traktorFile);
      expect(result).toMatch(/My Songs[/\\]Track & Beat\.mp3$/);
    });

    it('should handle paths with accented characters', () => {
      const traktorDir = '/:Users/:josev/:Music/:Drøpz/:';
      const traktorFile = 'Música.mp3';

      const result = mapTraktorPathToSystem(traktorDir, traktorFile);
      expect(result).toMatch(/Drøpz[/\\]Música\.mp3$/);
    });

    it('should handle deep nested paths', () => {
      const traktorDir = '/:home/:user/:Music/:DJ/:Sets/:2026/:January/:';
      const traktorFile = 'set.mp3';

      const result = mapTraktorPathToSystem(traktorDir, traktorFile);
      expect(result).toMatch(/Music[/\\]DJ[/\\]Sets[/\\]2026[/\\]January[/\\]set\.mp3$/);
    });
  });

  describe('mapSystemPathToTraktor()', () => {
    it('should convert Unix path to Traktor format', () => {
      const systemPath = '/Users/josev/Music/BOX/2601/test.mp3';

      const result = mapSystemPathToTraktor(systemPath);
      expect(result.dir).toBe('/:Users/:josev/:Music/:BOX/:2601/:');
      expect(result.file).toBe('test.mp3');
      expect(result.volume).toBe('');
    });

    it('should convert Windows path to Traktor format with VOLUME', () => {
      const systemPath = 'C:\\Users\\josev\\Music\\BOX\\2601\\test.mp3';

      const result = mapSystemPathToTraktor(systemPath);
      expect(result.dir).toBe('/:Users/:josev/:Music/:BOX/:2601/:');
      expect(result.file).toBe('test.mp3');
      expect(result.volume).toBe('C:');
    });

    it('should handle paths with special characters', () => {
      const systemPath = '/Users/josev/Music/My Songs/Track & Beat.mp3';

      const result = mapSystemPathToTraktor(systemPath);
      expect(result.dir).toBe('/:Users/:josev/:Music/:My Songs/:');
      expect(result.file).toBe('Track & Beat.mp3');
      expect(result.volume).toBe('');
    });

    it('should handle root-level file', () => {
      const systemPath = '/music.mp3';

      const result = mapSystemPathToTraktor(systemPath);
      expect(result.dir).toBe('/:');
      expect(result.file).toBe('music.mp3');
      expect(result.volume).toBe('');
    });

    it('should handle Windows D: drive', () => {
      const systemPath = 'D:\\Music\\track.mp3';

      const result = mapSystemPathToTraktor(systemPath);
      expect(result.dir).toBe('/:Music/:');
      expect(result.file).toBe('track.mp3');
      expect(result.volume).toBe('D:');
    });
  });

  describe('mapTraktorRating()', () => {
    it('should map 0 to 0 stars', () => {
      expect(mapTraktorRating('0')).toBe(0);
    });

    it('should map 51 to 1 star', () => {
      expect(mapTraktorRating('51')).toBe(1);
    });

    it('should map 102 to 2 stars', () => {
      expect(mapTraktorRating('102')).toBe(2);
    });

    it('should map 153 to 3 stars', () => {
      expect(mapTraktorRating('153')).toBe(3);
    });

    it('should map 204 to 4 stars', () => {
      expect(mapTraktorRating('204')).toBe(4);
    });

    it('should map 255 to 5 stars', () => {
      expect(mapTraktorRating('255')).toBe(5);
    });

    it('should round intermediate values', () => {
      expect(mapTraktorRating('100')).toBe(2); // ~1.96, rounds to 2
      expect(mapTraktorRating('150')).toBe(3); // ~2.94, rounds to 3
      expect(mapTraktorRating('200')).toBe(4); // ~3.92, rounds to 4
    });

    it('should return 0 for undefined', () => {
      expect(mapTraktorRating(undefined)).toBe(0);
    });
  });

  describe('mapHarmonyRatingToTraktor()', () => {
    it('should map 0 stars to 0', () => {
      expect(mapHarmonyRatingToTraktor(0)).toBe('0');
    });

    it('should map 1 star to 51', () => {
      expect(mapHarmonyRatingToTraktor(1)).toBe('51');
    });

    it('should map 2 stars to 102', () => {
      expect(mapHarmonyRatingToTraktor(2)).toBe('102');
    });

    it('should map 3 stars to 153', () => {
      expect(mapHarmonyRatingToTraktor(3)).toBe('153');
    });

    it('should map 4 stars to 204', () => {
      expect(mapHarmonyRatingToTraktor(4)).toBe('204');
    });

    it('should map 5 stars to 255', () => {
      expect(mapHarmonyRatingToTraktor(5)).toBe('255');
    });
  });

  describe('mapTraktorBpm()', () => {
    it('should parse BPM string to number', () => {
      expect(mapTraktorBpm('123.000061')).toBe(123);
    });

    it('should round BPM to nearest integer', () => {
      expect(mapTraktorBpm('126.7')).toBe(127);
      expect(mapTraktorBpm('126.4')).toBe(126);
    });

    it('should return undefined for undefined', () => {
      expect(mapTraktorBpm(undefined)).toBeUndefined();
    });

    it('should return undefined for invalid input', () => {
      expect(mapTraktorBpm('abc')).toBeUndefined();
    });
  });

  describe('parseTraktorDate()', () => {
    it('should parse Traktor date format YYYY/M/D', () => {
      const result = parseTraktorDate('2026/1/15');
      expect(result).toBeDefined();
      expect(result?.getFullYear()).toBe(2026);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it('should parse full dates with two-digit months/days', () => {
      const result = parseTraktorDate('2025/11/28');
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(10); // November is 10
      expect(result?.getDate()).toBe(28);
    });

    it('should return undefined for undefined', () => {
      expect(parseTraktorDate(undefined)).toBeUndefined();
    });

    it('should return undefined for invalid date', () => {
      expect(parseTraktorDate('not-a-date')).toBeUndefined();
    });
  });

  describe('mapTraktorEntryToTrack()', () => {
    let entries: TraktorEntry[];

    // Load entries once for all tests
    beforeAll(async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      entries = nml.NML.COLLECTION.ENTRY;
    });

    it('should map basic track info (title, artist, album)', () => {
      const entry = entries[0]; // S.W.A.G
      const track = mapTraktorEntryToTrack(entry);

      expect(track.title).toBe('S.W.A.G');
      expect(track.artist).toBe('Jamie Coins, Classmatic');
      expect(track.album).toBe('S.W.A.G');
    });

    it('should map file path correctly', () => {
      const entry = entries[0];
      const track = mapTraktorEntryToTrack(entry);

      // Path should be OS-native format (Windows: C:\..., Linux: C:/...)
      // All fixture entries have VOLUME="C:", so expect C: prefix
      expect(track.path).toMatch(/^C:[/\\]/);
      expect(track.path).toMatch(/Users[/\\]josev[/\\]Music[/\\]BOX[/\\]2601[/\\]/);
      expect(track.path).toContain('S.W.A.G');
      expect(track.path).toContain('.mp3');
    });

    it('should map duration from PLAYTIME (seconds)', () => {
      const entry = entries[0]; // PLAYTIME=379
      const track = mapTraktorEntryToTrack(entry);

      expect(track.duration).toBe(379);
    });

    it('should map genre', () => {
      const entry = entries[0]; // Tech House
      const track = mapTraktorEntryToTrack(entry);

      expect(track.genre).toBe('Tech House');
    });

    it('should map BPM from TEMPO', () => {
      const entry = entries[0]; // BPM=123.000061
      const track = mapTraktorEntryToTrack(entry);

      expect(track.bpm).toBe(123);
    });

    it('should map bitrate from INFO (convert to kbps)', () => {
      const entry = entries[0]; // BITRATE=320000
      const track = mapTraktorEntryToTrack(entry);

      expect(track.bitrate).toBe(320); // kbps
    });

    it('should map rating using RANKING', () => {
      const entry = entries[0]; // RANKING=102 (2 stars)
      const track = mapTraktorEntryToTrack(entry);

      expect(track.rating?.rating).toBe(2);
      expect(track.rating?.source).toBe('traktor');
    });

    it('should map musical key from INFO.KEY', () => {
      const entry = entries[0]; // KEY=1m -> Am
      const track = mapTraktorEntryToTrack(entry);

      expect(track.initialKey).toBe('Am');
    });

    it('should map year from RELEASE_DATE', () => {
      const entry = entries[0]; // RELEASE_DATE=2018/1/1
      const track = mapTraktorEntryToTrack(entry);

      expect(track.year).toBe(2018);
    });

    it('should generate deterministic id from path using makeTrackID', () => {
      const entry = entries[0];
      const track1 = mapTraktorEntryToTrack(entry);
      const track2 = mapTraktorEntryToTrack(entry);

      // Same entry should produce same ID
      expect(track1.id).toBe(track2.id);

      // ID should be 16-char uppercase hex
      expect(track1.id).toMatch(/^[0-9A-F]{16}$/);
      expect(track1.id.length).toBe(16);
    });

    it('should map comment when present', () => {
      // Find entry with comment
      const entryWithComment = entries.find(e => e.INFO?.COMMENT);
      if (entryWithComment) {
        const track = mapTraktorEntryToTrack(entryWithComment);
        expect(track.comment).toBeDefined();
        expect(track.comment?.length).toBeGreaterThan(0);
      }
    });

    it('should handle entries with minimal data', () => {
      const minimalEntry: TraktorEntry = {
        TITLE: 'Test Track',
        LOCATION: { DIR: '/:test/:', FILE: 'test.mp3', VOLUME: '' },
      };

      const track = mapTraktorEntryToTrack(minimalEntry);

      expect(track.title).toBe('Test Track');
      // Without VOLUME, path is resolved from root
      expect(track.path).toMatch(/[/\\]test[/\\]test\.mp3$/);
      expect(track.duration).toBe(0);
      expect(track.artist).toBeUndefined();
    });

    it('should map album track number', () => {
      // Find entry with track number (Me Beija has TRACK=1, OF_TRACKS=5)
      const entryWithTrackNum = entries.find(e => e.ALBUM?.TRACK);
      expect(entryWithTrackNum).toBeDefined();
    });

    it('should handle special characters in filename', () => {
      // First entry has & in filename
      const entry = entries[0];
      const track = mapTraktorEntryToTrack(entry);

      // Should have & not &amp;
      expect(track.path).toContain('&');
      expect(track.path).not.toContain('&amp;');
    });
  });

  describe('Integration: Parse and map full collection', () => {
    it('should map all entries without errors', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      const tracks: Track[] = [];
      const errors: string[] = [];

      for (const entry of nml.NML.COLLECTION.ENTRY) {
        try {
          const track = mapTraktorEntryToTrack(entry);
          tracks.push(track);
        } catch (error) {
          errors.push(`Failed to map ${entry.TITLE}: ${error}`);
        }
      }

      expect(errors).toHaveLength(0);
      expect(tracks.length).toBe(nml.NML.COLLECTION.ENTRY.length);
    });

    it('should map tracks efficiently (< 5 seconds for ~2600 entries)', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      const startTime = Date.now();
      const tracks = nml.NML.COLLECTION.ENTRY.map(e => mapTraktorEntryToTrack(e));
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000);
      expect(tracks.length).toBeGreaterThan(100);
    });
  });

  describe('bpmPrecise and releaseDate preservation', () => {
    let entries: TraktorEntry[];

    beforeAll(async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      entries = nml.NML.COLLECTION.ENTRY;
    });

    it('should preserve precise BPM in bpmPrecise field', () => {
      const entry = entries[0]; // Has BPM=123.000061
      const track = mapTraktorEntryToTrack(entry);

      // bpm should be rounded integer
      expect(track.bpm).toBe(123);
      // bpmPrecise should preserve original value
      expect(track.bpmPrecise).toBe('123.000061');
    });

    it('should preserve full release date in releaseDate field', () => {
      // Find an entry with a release date
      const entryWithDate = entries.find(e => e.INFO?.RELEASE_DATE);
      if (entryWithDate) {
        const track = mapTraktorEntryToTrack(entryWithDate);

        // releaseDate should preserve the full date
        expect(track.releaseDate).toBeDefined();
        expect(track.releaseDate).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}$/);
      }
    });

    it('should handle entries without TEMPO (no bpmPrecise)', () => {
      const minimalEntry: TraktorEntry = {
        LOCATION: { DIR: '/:test/:', FILE: 'test.mp3', VOLUME: '' },
        TITLE: 'No BPM Track',
      };

      const track = mapTraktorEntryToTrack(minimalEntry);

      expect(track.bpm).toBeUndefined();
      expect(track.bpmPrecise).toBeUndefined();
    });

    it('should handle entries without RELEASE_DATE (no releaseDate)', () => {
      const minimalEntry: TraktorEntry = {
        LOCATION: { DIR: '/:test/:', FILE: 'test.mp3', VOLUME: '' },
        TITLE: 'No Date Track',
      };

      const track = mapTraktorEntryToTrack(minimalEntry);

      expect(track.year).toBeUndefined();
      expect(track.releaseDate).toBeUndefined();
    });
  });
});
