/**
 * NML Writer Tests
 *
 * Tests for writing changes back to Traktor's collection.nml file.
 *
 * AIDEV-NOTE: The writer strategy is:
 * 1. Parse existing NML to preserve structure
 * 2. Update only the changed entries
 * 3. Preserve all unchanged data (cue points, analysis, etc.)
 * 4. Write back valid XML that Traktor can read
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';

import type { Track } from '../../../../preload/types/harmony';
import type { CuePoint, CueType } from '../../../../preload/types/cue-point';
import { TraktorNMLWriter, buildEntryXml, buildCueXml, escapeXml, formatTraktorDate } from '../nml-writer';
import { TraktorNMLParser } from '../nml-parser';

// Path to test fixture
const FIXTURE_PATH = join(__dirname, 'fixtures', 'collection.nml');

// Helper to create a minimal track
function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-id',
    path: '/Users/test/Music/track.mp3',
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

describe('nml-writer', () => {
  describe('escapeXml', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than', () => {
      expect(escapeXml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b');
    });

    it('should escape quotes', () => {
      expect(escapeXml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should escape apostrophes', () => {
      expect(escapeXml("It's")).toBe('It&apos;s');
    });

    it('should handle multiple escapes', () => {
      expect(escapeXml('A & B < C > D "E" F\'s')).toBe('A &amp; B &lt; C &gt; D &quot;E&quot; F&apos;s');
    });

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle string with no special chars', () => {
      expect(escapeXml('Normal Text')).toBe('Normal Text');
    });
  });

  describe('formatTraktorDate', () => {
    it('should format date as YYYY/M/D', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      expect(formatTraktorDate(date)).toBe('2024/6/15');
    });

    it('should not zero-pad month and day', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatTraktorDate(date)).toBe('2024/1/5');
    });
  });

  describe('buildCueXml', () => {
    it('should build XML for a hot cue', () => {
      const cue = createCuePoint({
        type: 'hot_cue' as CueType,
        positionMs: 5000.5,
        hotcueSlot: 0,
        name: 'Intro',
      });

      const xml = buildCueXml(cue);

      expect(xml).toContain('TYPE="0"');
      expect(xml).toContain('START="5000.500000"'); // Traktor uses 6 decimal places
      expect(xml).toContain('HOTCUE="0"');
      expect(xml).toContain('NAME="Intro"');
    });

    it('should build XML for a loop', () => {
      const cue = createCuePoint({
        type: 'loop' as CueType,
        positionMs: 10000,
        lengthMs: 4000,
        hotcueSlot: 2,
      });

      const xml = buildCueXml(cue);

      expect(xml).toContain('TYPE="5"');
      expect(xml).toContain('START="10000.000000"');
      expect(xml).toContain('LEN="4000.000000"');
      expect(xml).toContain('HOTCUE="2"');
    });

    it('should build XML for a grid marker', () => {
      const cue = createCuePoint({
        type: 'grid' as CueType,
        positionMs: 100,
        name: 'AutoGrid',
      });

      const xml = buildCueXml(cue);

      expect(xml).toContain('TYPE="4"');
      expect(xml).toContain('START="100.000000"');
      expect(xml).toContain('NAME="AutoGrid"');
    });

    it('should escape special characters in name', () => {
      const cue = createCuePoint({
        name: 'Drop & Build',
      });

      const xml = buildCueXml(cue);

      expect(xml).toContain('NAME="Drop &amp; Build"');
    });

    it('should always include LEN and REPEATS per Traktor format', () => {
      const cue = createCuePoint({
        type: 'hot_cue' as CueType,
        positionMs: 1000,
        // No length specified - should default to 0
      });

      const xml = buildCueXml(cue);

      // Traktor format always includes these
      expect(xml).toContain('LEN="0.000000"');
      expect(xml).toContain('REPEATS="-1"');
    });
  });

  describe('buildEntryXml', () => {
    it('should build complete entry XML', () => {
      const track = createTrack({
        title: 'My Track',
        artist: 'DJ Test',
        album: 'Test Album',
        genre: 'House',
        bpm: 128,
        year: 2024,
        comment: 'Great track!',
        rating: { rating: 4, source: 'harmony' },
        duration: 300,
        bitrate: 320,
        initialKey: 'Am',
      });

      const xml = buildEntryXml(track);

      expect(xml).toContain('TITLE="My Track"');
      expect(xml).toContain('ARTIST="DJ Test"');
      expect(xml).toContain('TITLE="Test Album"'); // Album title
      expect(xml).toContain('GENRE="House"');
      expect(xml).toContain('BPM="128"');
      expect(xml).toContain('RANKING="204"'); // 4 stars = 204
      expect(xml).toContain('COMMENT="Great track!"');
      expect(xml).toContain('PLAYTIME="300"');
      expect(xml).toContain('BITRATE="320000"');
    });

    it('should build LOCATION element with Traktor path format', () => {
      const track = createTrack({
        path: '/Users/dj/Music/track.mp3',
      });

      const xml = buildEntryXml(track);

      expect(xml).toContain('DIR="/:Users/:dj/:Music/:"');
      expect(xml).toContain('FILE="track.mp3"');
    });

    it('should include cue points when provided', () => {
      const track = createTrack();
      const cues = [
        createCuePoint({ positionMs: 1000, hotcueSlot: 0 }),
        createCuePoint({ positionMs: 5000, hotcueSlot: 1 }),
      ];

      const xml = buildEntryXml(track, cues);

      expect(xml).toContain('<CUE_V2');
      expect(xml).toContain('START="1000.000000"');
      expect(xml).toContain('START="5000.000000"');
    });

    it('should escape special characters in all text fields', () => {
      const track = createTrack({
        title: 'Track & More',
        artist: 'Artist "The Great"',
        comment: "It's <amazing>",
      });

      const xml = buildEntryXml(track);

      expect(xml).toContain('TITLE="Track &amp; More"');
      expect(xml).toContain('ARTIST="Artist &quot;The Great&quot;"');
      expect(xml).toContain('COMMENT="It&apos;s &lt;amazing&gt;"');
    });
  });

  describe('TraktorNMLWriter', () => {
    it('should update a single track in existing NML', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const writer = new TraktorNMLWriter();

      // Get original first entry path
      const firstEntry = nml.NML.COLLECTION.ENTRY[0];
      const originalPath = `${firstEntry.LOCATION.DIR.replace(/\/:/g, '/').slice(0, -1)}/${firstEntry.LOCATION.FILE}`;

      // Create updated track
      const updatedTrack = createTrack({
        path: originalPath,
        title: 'Updated Title',
        artist: 'Updated Artist',
      });

      // Update the NML
      const updatedNml = writer.updateTrack(nml, updatedTrack);

      // Find the updated entry
      const updatedEntry = updatedNml.NML.COLLECTION.ENTRY.find(e => {
        const entryPath = `${e.LOCATION.DIR.replace(/\/:/g, '/').slice(0, -1)}/${e.LOCATION.FILE}`;
        return entryPath === originalPath;
      });

      expect(updatedEntry).toBeDefined();
      expect(updatedEntry!.TITLE).toBe('Updated Title');
      expect(updatedEntry!.ARTIST).toBe('Updated Artist');
    });

    it('should preserve unchanged fields when updating', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const writer = new TraktorNMLWriter();

      // Get first entry with cues
      const entryWithCues = nml.NML.COLLECTION.ENTRY.find(e => e.CUE_V2);
      if (!entryWithCues) {
        // Skip test if no entries have cues
        return;
      }

      const originalPath = `${entryWithCues.LOCATION.DIR.replace(/\/:/g, '/').slice(0, -1)}/${entryWithCues.LOCATION.FILE}`;
      const originalCues = entryWithCues.CUE_V2;

      // Update just the title
      const updatedTrack = createTrack({
        path: originalPath,
        title: 'New Title Only',
      });

      const updatedNml = writer.updateTrack(nml, updatedTrack);

      const updatedEntry = updatedNml.NML.COLLECTION.ENTRY.find(e => {
        const entryPath = `${e.LOCATION.DIR.replace(/\/:/g, '/').slice(0, -1)}/${e.LOCATION.FILE}`;
        return entryPath === originalPath;
      });

      // Cues should be preserved
      expect(updatedEntry!.CUE_V2).toEqual(originalCues);
    });

    it('should generate valid XML output', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const writer = new TraktorNMLWriter();

      const xml = writer.toXml(nml);

      // Should have XML declaration
      expect(xml).toContain('<?xml version="1.0"');
      // Should have NML root
      expect(xml).toContain('<NML');
      expect(xml).toContain('</NML>');
      // Should have collection
      expect(xml).toContain('<COLLECTION');
      expect(xml).toContain('</COLLECTION>');
    });

    it('should round-trip parse and write', async () => {
      const parser = new TraktorNMLParser();
      const writer = new TraktorNMLWriter();

      // Parse original
      const nml1 = await parser.parse(FIXTURE_PATH);
      const trackCount1 = nml1.NML.COLLECTION.ENTRY.length;

      // Write to XML
      const xml = writer.toXml(nml1);

      // Parse the written XML
      const nml2 = parser.parseXml(xml);
      const trackCount2 = nml2.NML.COLLECTION.ENTRY.length;

      // Should have same number of tracks
      expect(trackCount2).toBe(trackCount1);
    });

    it('should always include NAME attribute in cues (n.n. as default)', () => {
      const writer = new TraktorNMLWriter();
      const nml = {
        NML: {
          VERSION: '19',
          HEAD: { COMPANY: 'www.native-instruments.com', PROGRAM: 'Traktor' },
          MUSICFOLDERS: {},
          COLLECTION: {
            ENTRIES: '1',
            ENTRY: [
              {
                LOCATION: { DIR: '/:Test/:', FILE: 'test.mp3', VOLUME: '' },
                CUE_V2: [
                  { TYPE: '0', START: '1000.000000' }, // No NAME - should get n.n.
                  { TYPE: '0', START: '2000.000000', NAME: 'Intro' }, // Has NAME
                ],
              },
            ],
          },
        },
      };

      const xml = writer.toXml(nml);

      // Both cues should have NAME attribute
      expect(xml).toContain('NAME="n.n."');
      expect(xml).toContain('NAME="Intro"');
    });

    it('should include GRID element for AutoGrid cues (TYPE=4)', () => {
      const writer = new TraktorNMLWriter();
      const nml = {
        NML: {
          VERSION: '19',
          HEAD: { COMPANY: 'www.native-instruments.com', PROGRAM: 'Traktor' },
          MUSICFOLDERS: {},
          COLLECTION: {
            ENTRIES: '1',
            ENTRY: [
              {
                LOCATION: { DIR: '/:Test/:', FILE: 'test.mp3', VOLUME: '' },
                CUE_V2: [
                  {
                    NAME: 'AutoGrid',
                    TYPE: '4',
                    START: '53.823734',
                    LEN: '0.000000',
                    REPEATS: '-1',
                    HOTCUE: '-1',
                    GRID: { BPM: '123.000061' },
                  },
                ],
              },
            ],
          },
        },
      };

      const xml = writer.toXml(nml);

      // Should contain GRID element with precise BPM
      expect(xml).toContain('<GRID BPM="123.000061"></GRID>');
      expect(xml).toContain('NAME="AutoGrid"');
      expect(xml).toContain('TYPE="4"');
    });

    it('should preserve INDEXING section', () => {
      const writer = new TraktorNMLWriter();
      const nml = {
        NML: {
          VERSION: '19',
          HEAD: { COMPANY: 'www.native-instruments.com', PROGRAM: 'Traktor' },
          MUSICFOLDERS: {},
          COLLECTION: { ENTRIES: '0', ENTRY: [] },
          INDEXING: {
            SORTING_INFO: [{ PATH: '$COLLECTION' }, { PATH: 'Native Instruments' }],
          },
        },
      };

      const xml = writer.toXml(nml);

      expect(xml).toContain('<INDEXING>');
      expect(xml).toContain('</INDEXING>');
      expect(xml).toContain('PATH="$COLLECTION"');
      expect(xml).toContain('PATH="Native Instruments"');
    });

    it('should preserve COLOR in INFO element', () => {
      const writer = new TraktorNMLWriter();
      const nml = {
        NML: {
          VERSION: '19',
          HEAD: { COMPANY: 'www.native-instruments.com', PROGRAM: 'Traktor' },
          MUSICFOLDERS: {},
          COLLECTION: {
            ENTRIES: '1',
            ENTRY: [
              {
                LOCATION: { DIR: '/:Test/:', FILE: 'test.mp3', VOLUME: '' },
                INFO: { BITRATE: '320000', COLOR: '5' },
              },
            ],
          },
        },
      };

      const xml = writer.toXml(nml);

      expect(xml).toContain('COLOR="5"');
    });
  });
});
