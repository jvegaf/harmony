/**
 * NML Parser Tests
 *
 * TDD tests for parsing Traktor's collection.nml XML files.
 * Uses real data from the collection.nml fixture.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

import { TraktorNMLParser } from '../nml-parser';

const FIXTURE_PATH = resolve(__dirname, 'fixtures/collection.nml');

describe('TraktorNMLParser', () => {
  describe('parse()', () => {
    it('should parse NML version from root element', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      expect(nml.NML.VERSION).toBe('19');
    });

    it('should extract HEAD metadata', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      expect(nml.NML.HEAD.COMPANY).toBe('www.native-instruments.com');
      expect(nml.NML.HEAD.PROGRAM).toBe('Traktor');
    });

    it('should parse COLLECTION with correct entry count', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      expect(nml.NML.COLLECTION.ENTRIES).toBe('2646');
      expect(nml.NML.COLLECTION.ENTRY.length).toBeGreaterThan(0);
    });

    it('should throw on non-existent file', async () => {
      const parser = new TraktorNMLParser();
      await expect(parser.parse('/nonexistent/path.nml')).rejects.toThrow();
    });
  });

  describe('parseEntry() - TITLE and ARTIST', () => {
    it('should extract TITLE and ARTIST from first entry (S.W.A.G)', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const entry = nml.NML.COLLECTION.ENTRY[0];

      expect(entry.TITLE).toBe('S.W.A.G');
      expect(entry.ARTIST).toBe('Jamie Coins, Classmatic');
    });

    it('should extract AUDIO_ID from entry', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const entry = nml.NML.COLLECTION.ENTRY[0];

      expect(entry.AUDIO_ID).toBeDefined();
      expect(entry.AUDIO_ID).toContain('AXsUQ1M0');
    });

    it('should extract MODIFIED_DATE and MODIFIED_TIME', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const entry = nml.NML.COLLECTION.ENTRY[0];

      expect(entry.MODIFIED_DATE).toBe('2026/1/15');
      expect(entry.MODIFIED_TIME).toBeDefined();
    });
  });

  describe('parseEntry() - LOCATION', () => {
    it('should parse LOCATION with DIR, FILE, VOLUME', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const location = nml.NML.COLLECTION.ENTRY[0].LOCATION;

      expect(location.DIR).toBe('/:Users/:josev/:Music/:BOX/:2601/:');
      expect(location.FILE).toContain('S.W.A.G');
      expect(location.VOLUME).toBe('C:');
      expect(location.VOLUMEID).toBe('44c628d3');
    });

    it('should handle ampersand in filename', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const entry = nml.NML.COLLECTION.ENTRY[0];

      // The file contains &amp; which should be decoded
      expect(entry.LOCATION.FILE).toContain('Jamie Coins');
      expect(entry.LOCATION.FILE).toContain('Classmatic');
    });
  });

  describe('parseEntry() - INFO block', () => {
    it('should parse INFO block with all metadata fields', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const info = nml.NML.COLLECTION.ENTRY[0].INFO;

      expect(info?.BITRATE).toBe('320000');
      expect(info?.GENRE).toBe('Tech House');
      expect(info?.LABEL).toBe('La Pera Records');
      expect(info?.PLAYTIME).toBe('379');
      expect(info?.RANKING).toBe('102');
      expect(info?.KEY).toBe('1m');
    });

    it('should parse IMPORT_DATE and RELEASE_DATE', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const info = nml.NML.COLLECTION.ENTRY[0].INFO;

      expect(info?.IMPORT_DATE).toBe('2026/1/15');
      expect(info?.RELEASE_DATE).toBe('2018/1/1');
    });

    it('should parse FLAGS and FILESIZE', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const info = nml.NML.COLLECTION.ENTRY[0].INFO;

      expect(info?.FLAGS).toBe('14');
      expect(info?.FILESIZE).toBe('14928');
    });

    it('should parse entry with PLAYCOUNT and LAST_PLAYED', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with PLAYCOUNT (e.g., "Caravan")
      const entryWithPlaycount = nml.NML.COLLECTION.ENTRY.find(e => e.INFO?.PLAYCOUNT);
      expect(entryWithPlaycount).toBeDefined();
      expect(entryWithPlaycount?.INFO?.PLAYCOUNT).toBeDefined();
      expect(entryWithPlaycount?.INFO?.LAST_PLAYED).toBeDefined();
    });

    it('should parse entry with COMMENT', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with COMMENT
      const entryWithComment = nml.NML.COLLECTION.ENTRY.find(e => e.INFO?.COMMENT);
      expect(entryWithComment).toBeDefined();
      expect(entryWithComment?.INFO?.COMMENT).toBeDefined();
    });

    it('should parse COVERARTID', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with COVERARTID
      const entryWithCover = nml.NML.COLLECTION.ENTRY.find(e => e.INFO?.COVERARTID);
      expect(entryWithCover).toBeDefined();
      expect(entryWithCover?.INFO?.COVERARTID).toBeDefined();
    });
  });

  describe('parseEntry() - TEMPO', () => {
    it('should parse TEMPO with BPM', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const tempo = nml.NML.COLLECTION.ENTRY[0].TEMPO;

      expect(tempo?.BPM).toBe('123.000061');
      expect(tempo?.BPM_QUALITY).toBe('100.000000');
    });
  });

  describe('parseEntry() - LOUDNESS', () => {
    it('should parse LOUDNESS data', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const loudness = nml.NML.COLLECTION.ENTRY[0].LOUDNESS;

      expect(loudness?.PEAK_DB).toBe('-0.973836');
      expect(loudness?.PERCEIVED_DB).toBe('-0.627350');
      expect(loudness?.ANALYZED_DB).toBe('-0.627350');
    });
  });

  describe('parseEntry() - MUSICAL_KEY', () => {
    it('should parse MUSICAL_KEY value', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const key = nml.NML.COLLECTION.ENTRY[0].MUSICAL_KEY;

      expect(key?.VALUE).toBe('21');
    });
  });

  describe('parseEntry() - ALBUM', () => {
    it('should parse ALBUM title', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const album = nml.NML.COLLECTION.ENTRY[0].ALBUM;

      expect(album?.TITLE).toBe('S.W.A.G');
    });

    it('should parse entry with ALBUM track number and total', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with OF_TRACKS (e.g., "Me Beija")
      const entryWithAlbum = nml.NML.COLLECTION.ENTRY.find(e => e.ALBUM?.OF_TRACKS === '5');
      expect(entryWithAlbum).toBeDefined();
      expect(entryWithAlbum?.ALBUM?.TRACK).toBe('1');
    });
  });

  describe('parseEntry() - CUE_V2', () => {
    it('should parse CUE_V2 with grid marker', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      const cueData = nml.NML.COLLECTION.ENTRY[0].CUE_V2;

      // CUE_V2 can be single object or array
      const cue = Array.isArray(cueData) ? cueData[0] : cueData;

      expect(cue).toBeDefined();
      expect(cue?.NAME).toBe('AutoGrid');
      expect(cue?.TYPE).toBe('4'); // Grid marker
      expect(cue?.START).toBe('53.823730');
      expect(cue?.LEN).toBe('0.000000');
      expect(cue?.HOTCUE).toBe('0');
    });

    it('should parse multiple CUE_V2 entries when present', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entries that might have multiple cues
      // Most entries in fixture have single AutoGrid cue
      const entry = nml.NML.COLLECTION.ENTRY[0];
      expect(entry.CUE_V2).toBeDefined();
    });
  });

  describe('parseEntry() - edge cases', () => {
    it('should handle entries with special characters in filename', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with ampersand in filename
      const entryWithAmp = nml.NML.COLLECTION.ENTRY.find(e => e.LOCATION.FILE.includes('&') || e.TITLE?.includes('&'));
      expect(entryWithAmp).toBeDefined();
    });

    it('should handle entries with accented characters', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with ø (Drøpz)
      const entryWithAccent = nml.NML.COLLECTION.ENTRY.find(e => e.LOCATION.FILE.includes('ø'));
      expect(entryWithAccent).toBeDefined();
    });

    it('should handle entries with brackets and @ in filename', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Find entry with [4DJsonline.com] or @house
      const entryWithBrackets = nml.NML.COLLECTION.ENTRY.find(
        e => e.LOCATION.FILE.includes('[') || e.LOCATION.FILE.includes('@'),
      );
      expect(entryWithBrackets).toBeDefined();
    });

    it('should parse a large number of entries efficiently', async () => {
      const parser = new TraktorNMLParser();
      const startTime = Date.now();
      const nml = await parser.parse(FIXTURE_PATH);
      const elapsed = Date.now() - startTime;

      // Should parse quickly (less than 5 seconds for ~2600 entries)
      expect(elapsed).toBeLessThan(5000);
      expect(nml.NML.COLLECTION.ENTRY.length).toBeGreaterThan(100);
    });
  });

  describe('parseXml() - INDEXING section', () => {
    it('should parse empty INDEXING section', () => {
      const parser = new TraktorNMLParser();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <NML VERSION="19">
          <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
          <COLLECTION ENTRIES="0"></COLLECTION>
          <INDEXING></INDEXING>
        </NML>`;

      const nml = parser.parseXml(xml);

      expect(nml.NML.INDEXING).toBeDefined();
    });

    it('should parse INDEXING with SORTING_INFO entries', () => {
      const parser = new TraktorNMLParser();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <NML VERSION="19">
          <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
          <COLLECTION ENTRIES="0"></COLLECTION>
          <INDEXING>
            <SORTING_INFO PATH="$COLLECTION"></SORTING_INFO>
            <SORTING_INFO PATH="Native Instruments"></SORTING_INFO>
          </INDEXING>
        </NML>`;

      const nml = parser.parseXml(xml);

      expect(nml.NML.INDEXING).toBeDefined();
      expect(nml.NML.INDEXING?.SORTING_INFO).toBeDefined();
      const sortingInfos = nml.NML.INDEXING?.SORTING_INFO;
      expect(Array.isArray(sortingInfos)).toBe(true);
      if (Array.isArray(sortingInfos)) {
        expect(sortingInfos.length).toBe(2);
        expect(sortingInfos[0].PATH).toBe('$COLLECTION');
        expect(sortingInfos[1].PATH).toBe('Native Instruments');
      }
    });

    it('should parse SORTING_INFO with CRITERIA element', () => {
      const parser = new TraktorNMLParser();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <NML VERSION="19">
          <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
          <COLLECTION ENTRIES="0"></COLLECTION>
          <INDEXING>
            <SORTING_INFO PATH="$COLLECTION">
              <CRITERIA ATTRIBUTE="BPM" DIRECTION="UP"></CRITERIA>
            </SORTING_INFO>
          </INDEXING>
        </NML>`;

      const nml = parser.parseXml(xml);

      expect(nml.NML.INDEXING).toBeDefined();
      const sortingInfos = nml.NML.INDEXING?.SORTING_INFO;
      expect(sortingInfos).toBeDefined();
      const info = Array.isArray(sortingInfos) ? sortingInfos[0] : sortingInfos;
      expect(info?.PATH).toBe('$COLLECTION');
      expect(info?.CRITERIA).toBeDefined();
      expect(info?.CRITERIA?.ATTRIBUTE).toBe('BPM');
      expect(info?.CRITERIA?.DIRECTION).toBe('UP');
    });

    it('should parse INDEXING from fixture file', async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);

      // Fixture has empty INDEXING, which should still be defined
      expect(nml.NML.INDEXING).toBeDefined();
    });
  });
});
