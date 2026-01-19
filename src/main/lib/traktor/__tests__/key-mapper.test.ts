/**
 * Key Mapper Tests
 *
 * TDD tests for converting between Traktor key notation and standard notation.
 * Uses real values from the collection.nml fixture.
 */

import { describe, it, expect } from 'vitest';

import { mapTraktorKey, mapTraktorKeyValue, mapHarmonyKeyToTraktor } from '../mappers/key-mapper';

describe('KeyMapper', () => {
  describe('mapTraktorKey() - Open Key notation from INFO.KEY', () => {
    // Real KEY values from collection.nml fixture:
    // KEY="1m" (S.W.A.G), KEY="12d" (Cacique), KEY="9m" (Tom's Diner)
    // KEY="10d" (Me Beija), KEY="2d" (Oh La La), KEY="10m" (Asking for Money)

    it('should map KEY="1m" to Am (minor)', () => {
      expect(mapTraktorKey('1m')).toBe('Am');
    });

    it('should map KEY="12d" to F (major/dur)', () => {
      expect(mapTraktorKey('12d')).toBe('F');
    });

    it('should map KEY="9m" to Fm', () => {
      expect(mapTraktorKey('9m')).toBe('Fm');
    });

    it('should map KEY="10d" to Eb', () => {
      expect(mapTraktorKey('10d')).toBe('Eb');
    });

    it('should map KEY="2d" to G', () => {
      expect(mapTraktorKey('2d')).toBe('G');
    });

    it('should map KEY="10m" to Cm', () => {
      expect(mapTraktorKey('10m')).toBe('Cm');
    });

    it('should map KEY="7m" to Ebm', () => {
      expect(mapTraktorKey('7m')).toBe('Ebm');
    });

    it('should map KEY="8m" to Bbm', () => {
      expect(mapTraktorKey('8m')).toBe('Bbm');
    });

    it('should map KEY="11m" to Gm', () => {
      expect(mapTraktorKey('11m')).toBe('Gm');
    });

    it('should map KEY="12m" to Dm', () => {
      expect(mapTraktorKey('12m')).toBe('Dm');
    });

    // All major keys
    it('should map all major keys (d = dur) correctly', () => {
      const majorKeys: [string, string][] = [
        ['1d', 'C'],
        ['2d', 'G'],
        ['3d', 'D'],
        ['4d', 'A'],
        ['5d', 'E'],
        ['6d', 'B'],
        ['7d', 'Gb'],
        ['8d', 'Db'],
        ['9d', 'Ab'],
        ['10d', 'Eb'],
        ['11d', 'Bb'],
        ['12d', 'F'],
      ];

      majorKeys.forEach(([traktor, expected]) => {
        expect(mapTraktorKey(traktor)).toBe(expected);
      });
    });

    // All minor keys
    it('should map all minor keys (m) correctly', () => {
      const minorKeys: [string, string][] = [
        ['1m', 'Am'],
        ['2m', 'Em'],
        ['3m', 'Bm'],
        ['4m', 'F#m'],
        ['5m', 'Dbm'],
        ['6m', 'Abm'],
        ['7m', 'Ebm'],
        ['8m', 'Bbm'],
        ['9m', 'Fm'],
        ['10m', 'Cm'],
        ['11m', 'Gm'],
        ['12m', 'Dm'],
      ];

      minorKeys.forEach(([traktor, expected]) => {
        expect(mapTraktorKey(traktor)).toBe(expected);
      });
    });

    // Edge cases
    it('should return undefined for invalid key', () => {
      expect(mapTraktorKey('invalid')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(mapTraktorKey('')).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(mapTraktorKey(undefined)).toBeUndefined();
    });

    it('should return undefined for null input', () => {
      expect(mapTraktorKey(null as unknown as string)).toBeUndefined();
    });

    it('should handle lowercase keys', () => {
      expect(mapTraktorKey('1M')).toBe('Am');
      expect(mapTraktorKey('1D')).toBe('C');
    });
  });

  describe('mapTraktorKeyValue() - MUSICAL_KEY.VALUE numeric notation', () => {
    // Real MUSICAL_KEY.VALUE from collection.nml fixture:
    // VALUE="21" (S.W.A.G = Am), VALUE="5" (Cacique = F), VALUE="17" (Tom's Diner = Fm)
    // VALUE="3" (Me Beija = Eb), VALUE="7" (Oh La La = G)

    it('should map VALUE="21" to Am', () => {
      expect(mapTraktorKeyValue('21')).toBe('Am');
    });

    it('should map VALUE="5" to F', () => {
      expect(mapTraktorKeyValue('5')).toBe('F');
    });

    it('should map VALUE="17" to Fm', () => {
      expect(mapTraktorKeyValue('17')).toBe('Fm');
    });

    it('should map VALUE="3" to Eb', () => {
      expect(mapTraktorKeyValue('3')).toBe('Eb');
    });

    it('should map VALUE="7" to G', () => {
      expect(mapTraktorKeyValue('7')).toBe('G');
    });

    // All values 0-23
    it('should map all major key values (0-11) correctly', () => {
      const majorKeys: [string, string][] = [
        ['0', 'C'],
        ['1', 'Db'],
        ['2', 'D'],
        ['3', 'Eb'],
        ['4', 'E'],
        ['5', 'F'],
        ['6', 'Gb'],
        ['7', 'G'],
        ['8', 'Ab'],
        ['9', 'A'],
        ['10', 'Bb'],
        ['11', 'B'],
      ];

      majorKeys.forEach(([value, expected]) => {
        expect(mapTraktorKeyValue(value)).toBe(expected);
      });
    });

    it('should map all minor key values (12-23) correctly', () => {
      const minorKeys: [string, string][] = [
        ['12', 'Cm'],
        ['13', 'Dbm'],
        ['14', 'Dm'],
        ['15', 'Ebm'],
        ['16', 'Em'],
        ['17', 'Fm'],
        ['18', 'Gbm'],
        ['19', 'Gm'],
        ['20', 'Abm'],
        ['21', 'Am'],
        ['22', 'Bbm'],
        ['23', 'Bm'],
      ];

      minorKeys.forEach(([value, expected]) => {
        expect(mapTraktorKeyValue(value)).toBe(expected);
      });
    });

    // Edge cases
    it('should return undefined for invalid value', () => {
      expect(mapTraktorKeyValue('24')).toBeUndefined();
      expect(mapTraktorKeyValue('-1')).toBeUndefined();
      expect(mapTraktorKeyValue('abc')).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(mapTraktorKeyValue(undefined)).toBeUndefined();
    });
  });

  describe('mapHarmonyKeyToTraktor() - reverse mapping', () => {
    it('should convert Am to 1m', () => {
      expect(mapHarmonyKeyToTraktor('Am')).toBe('1m');
    });

    it('should convert C to 1d', () => {
      expect(mapHarmonyKeyToTraktor('C')).toBe('1d');
    });

    it('should convert Fm to 9m', () => {
      expect(mapHarmonyKeyToTraktor('Fm')).toBe('9m');
    });

    it('should convert Eb to 10d', () => {
      expect(mapHarmonyKeyToTraktor('Eb')).toBe('10d');
    });

    it('should return undefined for unknown key', () => {
      expect(mapHarmonyKeyToTraktor('X#m')).toBeUndefined();
    });

    it('should be reversible (round-trip)', () => {
      const keys = ['Am', 'C', 'Fm', 'Eb', 'Gm', 'Dm', 'F#m', 'Bb'];
      keys.forEach(key => {
        const traktorKey = mapHarmonyKeyToTraktor(key);
        if (traktorKey) {
          const backToHarmony = mapTraktorKey(traktorKey);
          expect(backToHarmony).toBe(key);
        }
      });
    });
  });
});
