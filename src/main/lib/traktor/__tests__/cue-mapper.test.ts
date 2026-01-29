/**
 * Cue Mapper Tests
 *
 * TDD tests for mapping Traktor CUE_V2 entries to Harmony CuePoint objects.
 * Uses real data from the collection.nml fixture.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'path';

import { TraktorNMLParser } from '../nml-parser';
import {
  mapTraktorCueToHarmony,
  mapTraktorCuesToHarmony,
  mapHarmonyCueToTraktor,
  mapTraktorCueType,
  extractBeatGrid,
  generateCueId,
} from '../mappers/cue-mapper';
import type { TraktorCue, TraktorEntry } from '../types/nml-types';
import { CueType } from '../../../../preload/types/cue-point';

const FIXTURE_PATH = resolve(__dirname, 'fixtures/collection.nml');

describe('Cue Mapper', () => {
  describe('mapTraktorCueType()', () => {
    it('should map TYPE 0 to HOT_CUE', () => {
      expect(mapTraktorCueType('0')).toBe(CueType.HOT_CUE);
    });

    it('should map TYPE 1 to FADE_IN', () => {
      expect(mapTraktorCueType('1')).toBe(CueType.FADE_IN);
    });

    it('should map TYPE 2 to FADE_OUT', () => {
      expect(mapTraktorCueType('2')).toBe(CueType.FADE_OUT);
    });

    it('should map TYPE 3 to LOAD', () => {
      expect(mapTraktorCueType('3')).toBe(CueType.LOAD);
    });

    it('should map TYPE 4 to GRID', () => {
      expect(mapTraktorCueType('4')).toBe(CueType.GRID);
    });

    it('should map TYPE 5 to LOOP', () => {
      expect(mapTraktorCueType('5')).toBe(CueType.LOOP);
    });

    it('should default to HOT_CUE for unknown types', () => {
      expect(mapTraktorCueType('99')).toBe(CueType.HOT_CUE);
    });
  });

  describe('mapTraktorCueToHarmony()', () => {
    it('should map a grid marker cue', () => {
      const traktorCue: TraktorCue = {
        NAME: 'AutoGrid',
        DISPL_ORDER: '0',
        TYPE: '4',
        START: '53.823730',
        LEN: '0.000000',
        REPEATS: '-1',
        HOTCUE: '0',
      };

      const cue = mapTraktorCueToHarmony(traktorCue, 'track-123');

      expect(cue.type).toBe(CueType.GRID);
      expect(cue.positionMs).toBeCloseTo(53.82373, 2);
      expect(cue.name).toBe('AutoGrid');
      expect(cue.trackId).toBe('track-123');
      expect(cue.order).toBe(0);
    });

    it('should map a hot cue with hotcue slot', () => {
      const traktorCue: TraktorCue = {
        NAME: 'n.n.',
        DISPL_ORDER: '0',
        TYPE: '0',
        START: '48963.828772',
        LEN: '0.000000',
        REPEATS: '-1',
        HOTCUE: '1',
      };

      const cue = mapTraktorCueToHarmony(traktorCue, 'track-123');

      expect(cue.type).toBe(CueType.HOT_CUE);
      expect(cue.positionMs).toBeCloseTo(48963.828772, 2);
      expect(cue.hotcueSlot).toBe(1);
    });

    it('should map a loop with length', () => {
      const traktorCue: TraktorCue = {
        NAME: 'n.n.',
        DISPL_ORDER: '0',
        TYPE: '5',
        START: '27672.039320',
        LEN: '1904.764671',
        REPEATS: '-1',
        HOTCUE: '3',
      };

      const cue = mapTraktorCueToHarmony(traktorCue, 'track-123');

      expect(cue.type).toBe(CueType.LOOP);
      expect(cue.positionMs).toBeCloseTo(27672.03932, 2);
      expect(cue.lengthMs).toBeCloseTo(1904.764671, 2);
      expect(cue.hotcueSlot).toBe(3);
    });

    it('should generate a unique ID', () => {
      const traktorCue: TraktorCue = {
        TYPE: '0',
        START: '1000',
      };

      const cue = mapTraktorCueToHarmony(traktorCue, 'track-123');

      expect(cue.id).toBeDefined();
      expect(cue.id.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', () => {
      const traktorCue: TraktorCue = {
        TYPE: '0',
        START: '5000',
      };

      const cue = mapTraktorCueToHarmony(traktorCue, 'track-123');

      expect(cue.type).toBe(CueType.HOT_CUE);
      expect(cue.positionMs).toBe(5000);
      expect(cue.name).toBeUndefined();
      expect(cue.lengthMs).toBeUndefined();
    });
  });

  describe('mapTraktorCuesToHarmony()', () => {
    it('should map single cue (not array)', () => {
      const traktorCue: TraktorCue = {
        TYPE: '4',
        START: '100',
      };

      const cues = mapTraktorCuesToHarmony(traktorCue, 'track-123');

      expect(cues).toHaveLength(1);
      expect(cues[0].type).toBe(CueType.GRID);
    });

    it('should map array of cues', () => {
      const traktorCues: TraktorCue[] = [
        { TYPE: '4', START: '100', HOTCUE: '0' },
        { TYPE: '0', START: '5000', HOTCUE: '1' },
        { TYPE: '5', START: '10000', LEN: '2000', HOTCUE: '2' },
      ];

      const cues = mapTraktorCuesToHarmony(traktorCues, 'track-123');

      expect(cues).toHaveLength(3);
      expect(cues[0].type).toBe(CueType.GRID);
      expect(cues[1].type).toBe(CueType.HOT_CUE);
      expect(cues[2].type).toBe(CueType.LOOP);
    });

    it('should return empty array for undefined', () => {
      const cues = mapTraktorCuesToHarmony(undefined, 'track-123');
      expect(cues).toHaveLength(0);
    });
  });

  describe('extractBeatGrid()', () => {
    it('should extract beatgrid from GRID cue and TEMPO', () => {
      const traktorCue: TraktorCue = {
        NAME: 'AutoGrid',
        TYPE: '4',
        START: '53.823730',
      };
      const bpm = '123.000061';

      const grid = extractBeatGrid(traktorCue, bpm);

      expect(grid).toBeDefined();
      expect(grid?.firstBeatMs).toBeCloseTo(53.82373, 2);
      expect(grid?.bpm).toBe(123);
    });

    it('should return undefined if cue is not GRID type', () => {
      const traktorCue: TraktorCue = {
        TYPE: '0',
        START: '100',
      };

      const grid = extractBeatGrid(traktorCue, '120');

      expect(grid).toBeUndefined();
    });

    it('should detect manual vs auto grid by name', () => {
      const autoCue: TraktorCue = {
        NAME: 'AutoGrid',
        TYPE: '4',
        START: '100',
      };
      const manualCue: TraktorCue = {
        NAME: 'Custom Grid',
        TYPE: '4',
        START: '100',
      };

      const autoGrid = extractBeatGrid(autoCue, '120');
      const manualGrid = extractBeatGrid(manualCue, '120');

      expect(autoGrid?.isManual).toBe(false);
      expect(manualGrid?.isManual).toBe(true);
    });
  });

  describe('mapHarmonyCueToTraktor()', () => {
    it('should map HOT_CUE to Traktor format', () => {
      const cue = {
        id: 'cue-1',
        trackId: 'track-1',
        type: CueType.HOT_CUE,
        positionMs: 5000.5,
        hotcueSlot: 1,
        name: 'Drop',
      };

      const traktor = mapHarmonyCueToTraktor(cue);

      expect(traktor.TYPE).toBe('0');
      expect(traktor.START).toBe('5000.500000');
      expect(traktor.HOTCUE).toBe('1');
      expect(traktor.NAME).toBe('Drop');
    });

    it('should map LOOP with length', () => {
      const cue = {
        id: 'cue-2',
        trackId: 'track-1',
        type: CueType.LOOP,
        positionMs: 10000,
        lengthMs: 2000,
        hotcueSlot: 2,
      };

      const traktor = mapHarmonyCueToTraktor(cue);

      expect(traktor.TYPE).toBe('5');
      expect(traktor.START).toBe('10000.000000');
      expect(traktor.LEN).toBe('2000.000000');
      expect(traktor.HOTCUE).toBe('2');
    });

    it('should map GRID marker', () => {
      const cue = {
        id: 'cue-3',
        trackId: 'track-1',
        type: CueType.GRID,
        positionMs: 53.82373,
        name: 'AutoGrid',
      };

      const traktor = mapHarmonyCueToTraktor(cue);

      expect(traktor.TYPE).toBe('4');
      expect(traktor.START).toBe('53.823730');
      expect(traktor.NAME).toBe('AutoGrid');
    });

    it('should set default values for optional fields', () => {
      const cue = {
        id: 'cue-4',
        trackId: 'track-1',
        type: CueType.HOT_CUE,
        positionMs: 1000,
      };

      const traktor = mapHarmonyCueToTraktor(cue);

      expect(traktor.LEN).toBe('0.000000');
      expect(traktor.REPEATS).toBe('-1');
      expect(traktor.DISPL_ORDER).toBe('0');
    });
  });

  describe('Integration: Parse cues from fixture', () => {
    let entries: TraktorEntry[];

    beforeAll(async () => {
      const parser = new TraktorNMLParser();
      const nml = await parser.parse(FIXTURE_PATH);
      entries = nml.NML.COLLECTION.ENTRY;
    });

    it('should map cues from first entry', () => {
      const entry = entries[0];
      const cues = mapTraktorCuesToHarmony(entry.CUE_V2, 'test-track');

      expect(cues.length).toBeGreaterThan(0);
      expect(cues[0].type).toBe(CueType.GRID);
      expect(cues[0].positionMs).toBeCloseTo(53.82373, 2);
    });

    it('should find entries with hot cues', () => {
      const entriesWithHotcues = entries.filter(e => {
        if (!e.CUE_V2) return false;
        const cues = Array.isArray(e.CUE_V2) ? e.CUE_V2 : [e.CUE_V2];
        return cues.some(c => c.TYPE === '0');
      });

      expect(entriesWithHotcues.length).toBeGreaterThan(0);
    });

    it('should find entries with loops', () => {
      const entriesWithLoops = entries.filter(e => {
        if (!e.CUE_V2) return false;
        const cues = Array.isArray(e.CUE_V2) ? e.CUE_V2 : [e.CUE_V2];
        return cues.some(c => c.TYPE === '5');
      });

      expect(entriesWithLoops.length).toBeGreaterThan(0);
    });

    it('should extract beatgrid from entry with TEMPO', () => {
      const entry = entries[0];
      const cues = Array.isArray(entry.CUE_V2) ? entry.CUE_V2 : entry.CUE_V2 ? [entry.CUE_V2] : [];
      const gridCue = cues.find(c => c.TYPE === '4');

      if (gridCue && entry.TEMPO?.BPM) {
        const grid = extractBeatGrid(gridCue, entry.TEMPO.BPM);
        expect(grid).toBeDefined();
        expect(grid?.bpm).toBe(123);
        expect(grid?.firstBeatMs).toBeCloseTo(53.82373, 2);
      }
    });
  });

  describe('generateCueId()', () => {
    it('should generate unique IDs for cues with same position but different hotcueSlot', () => {
      const trackId = 'track-123';
      const position = 48963.828772;
      const type = CueType.HOT_CUE;

      const id1 = generateCueId(trackId, position, type, 1);
      const id2 = generateCueId(trackId, position, type, 2);

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cue-[a-z0-9]+$/);
      expect(id2).toMatch(/^cue-[a-z0-9]+$/);
    });

    it('should generate same ID for identical inputs (idempotent)', () => {
      const trackId = 'track-abc';
      const position = 1000;
      const type = CueType.HOT_CUE;
      const slot = 3;

      const id1 = generateCueId(trackId, position, type, slot);
      const id2 = generateCueId(trackId, position, type, slot);

      expect(id1).toBe(id2);
    });

    it('should generate valid ID for GRID cue without hotcueSlot', () => {
      const trackId = 'track-xyz';
      const position = 53.82373;
      const type = CueType.GRID;

      const id = generateCueId(trackId, position, type);

      expect(id).toMatch(/^cue-[a-z0-9]+$/);
      expect(id.length).toBeGreaterThan(4);
    });

    it('should generate different IDs for different types at same position', () => {
      const trackId = 'track-123';
      const position = 5000;

      const hotCueId = generateCueId(trackId, position, CueType.HOT_CUE, 1);
      const loopId = generateCueId(trackId, position, CueType.LOOP, 1);

      expect(hotCueId).not.toBe(loopId);
    });

    it('should handle undefined hotcueSlot consistently', () => {
      const trackId = 'track-123';
      const position = 100;
      const type = CueType.GRID;

      const id1 = generateCueId(trackId, position, type, undefined);
      const id2 = generateCueId(trackId, position, type);

      expect(id1).toBe(id2);
    });
  });

  describe('mapTraktorCueToHarmony() - hotcueSlot uniqueness fix', () => {
    it('should generate unique IDs for cues at same position with different hotcue slots', () => {
      // This test verifies the fix for SQLITE_CONSTRAINT: UNIQUE constraint failed: cue_point.id
      // when Traktor has multiple hot cues at the same position with different slots
      const cue1: TraktorCue = {
        TYPE: '0',
        START: '48963.828772',
        HOTCUE: '1',
      };
      const cue2: TraktorCue = {
        TYPE: '0',
        START: '48963.828772',
        HOTCUE: '2',
      };

      const harmonyCue1 = mapTraktorCueToHarmony(cue1, 'track-xyz');
      const harmonyCue2 = mapTraktorCueToHarmony(cue2, 'track-xyz');

      expect(harmonyCue1.id).not.toBe(harmonyCue2.id);
      expect(harmonyCue1.hotcueSlot).toBe(1);
      expect(harmonyCue2.hotcueSlot).toBe(2);
    });

    it('should generate unique IDs for AutoGrid cues at same position', () => {
      // Traktor can have multiple AutoGrid cues at same position (hot_cue + grid)
      const hotCue: TraktorCue = {
        NAME: 'AutoGrid',
        TYPE: '0',
        START: '364.815186',
        HOTCUE: '0',
      };
      const gridCue: TraktorCue = {
        NAME: 'AutoGrid',
        TYPE: '4',
        START: '364.815186',
        HOTCUE: '-1',
      };

      const harmonyCue1 = mapTraktorCueToHarmony(hotCue, 'track-abc');
      const harmonyCue2 = mapTraktorCueToHarmony(gridCue, 'track-abc');

      expect(harmonyCue1.id).not.toBe(harmonyCue2.id);
    });
  });
});
