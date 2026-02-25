import { describe, expect, it } from 'vitest';
import {
  STANDARD_TO_CAMELOT,
  CAMELOT_TO_STANDARD,
  isCamelotKey,
  isStandardKey,
  standardToCamelot,
  camelotToStandard,
  ensureCamelot,
} from '../camelot';

describe('STANDARD_TO_CAMELOT mapping', () => {
  it('should contain all 24 canonical standard keys', () => {
    const canonicalKeys = [
      // Minor
      'Am',
      'Em',
      'Bm',
      'F#m',
      'Dbm',
      'Abm',
      'Ebm',
      'Bbm',
      'Fm',
      'Cm',
      'Gm',
      'Dm',
      // Major
      'C',
      'G',
      'D',
      'A',
      'E',
      'B',
      'F#',
      'Db',
      'Ab',
      'Eb',
      'Bb',
      'F',
    ];
    for (const key of canonicalKeys) {
      expect(STANDARD_TO_CAMELOT[key], `Missing key: ${key}`).toBeDefined();
    }
  });

  it('should map Am to 8A', () => {
    expect(STANDARD_TO_CAMELOT['Am']).toBe('8A');
  });

  it('should map C to 8B', () => {
    expect(STANDARD_TO_CAMELOT['C']).toBe('8B');
  });

  it('should map F#m to 11A', () => {
    expect(STANDARD_TO_CAMELOT['F#m']).toBe('11A');
  });

  it('should map Eb to 5B', () => {
    expect(STANDARD_TO_CAMELOT['Eb']).toBe('5B');
  });

  it('should map enharmonic G#m same as Abm', () => {
    expect(STANDARD_TO_CAMELOT['G#m']).toBe(STANDARD_TO_CAMELOT['Abm']);
  });

  it('should map enharmonic Gb same as F#', () => {
    expect(STANDARD_TO_CAMELOT['Gb']).toBe(STANDARD_TO_CAMELOT['F#']);
  });
});

describe('CAMELOT_TO_STANDARD mapping', () => {
  it('should have an entry for all 24 Camelot slots', () => {
    for (let i = 1; i <= 12; i++) {
      expect(CAMELOT_TO_STANDARD[`${i}A`], `Missing slot: ${i}A`).toBeDefined();
      expect(CAMELOT_TO_STANDARD[`${i}B`], `Missing slot: ${i}B`).toBeDefined();
    }
  });

  it('should map 8A to Am', () => {
    expect(CAMELOT_TO_STANDARD['8A']).toBe('Am');
  });

  it('should map 8B to C', () => {
    expect(CAMELOT_TO_STANDARD['8B']).toBe('C');
  });
});

describe('isCamelotKey()', () => {
  it('should return true for valid Camelot keys', () => {
    expect(isCamelotKey('1A')).toBe(true);
    expect(isCamelotKey('8A')).toBe(true);
    expect(isCamelotKey('11B')).toBe(true);
    expect(isCamelotKey('12B')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isCamelotKey('8a')).toBe(true);
    expect(isCamelotKey('11b')).toBe(true);
  });

  it('should return false for standard notation', () => {
    expect(isCamelotKey('Am')).toBe(false);
    expect(isCamelotKey('C')).toBe(false);
    expect(isCamelotKey('F#m')).toBe(false);
  });

  it('should return false for invalid strings', () => {
    expect(isCamelotKey('')).toBe(false);
    expect(isCamelotKey('13A')).toBe(false);
    expect(isCamelotKey('0A')).toBe(false);
    expect(isCamelotKey('8C')).toBe(false);
    expect(isCamelotKey('unknown')).toBe(false);
  });
});

describe('isStandardKey()', () => {
  it('should return true for known standard keys', () => {
    expect(isStandardKey('Am')).toBe(true);
    expect(isStandardKey('C')).toBe(true);
    expect(isStandardKey('F#m')).toBe(true);
    expect(isStandardKey('Eb')).toBe(true);
  });

  it('should return false for Camelot notation', () => {
    expect(isStandardKey('8A')).toBe(false);
    expect(isStandardKey('8B')).toBe(false);
  });

  it('should return false for unknown strings', () => {
    expect(isStandardKey('')).toBe(false);
    expect(isStandardKey('unknown')).toBe(false);
  });
});

describe('standardToCamelot()', () => {
  it('should convert all 12 minor standard keys', () => {
    const minorExpected: [string, string][] = [
      ['Abm', '1A'],
      ['Ebm', '2A'],
      ['Bbm', '3A'],
      ['Fm', '4A'],
      ['Cm', '5A'],
      ['Gm', '6A'],
      ['Dm', '7A'],
      ['Am', '8A'],
      ['Em', '9A'],
      ['Bm', '10A'],
      ['F#m', '11A'],
      ['Dbm', '12A'],
    ];
    for (const [standard, expected] of minorExpected) {
      expect(standardToCamelot(standard), `Failed: ${standard}`).toBe(expected);
    }
  });

  it('should convert all 12 major standard keys', () => {
    const majorExpected: [string, string][] = [
      ['B', '1B'],
      ['F#', '2B'],
      ['Db', '3B'],
      ['Ab', '4B'],
      ['Eb', '5B'],
      ['Bb', '6B'],
      ['F', '7B'],
      ['C', '8B'],
      ['G', '9B'],
      ['D', '10B'],
      ['A', '11B'],
      ['E', '12B'],
    ];
    for (const [standard, expected] of majorExpected) {
      expect(standardToCamelot(standard), `Failed: ${standard}`).toBe(expected);
    }
  });

  it('should return undefined for already-Camelot keys (prevent double conversion)', () => {
    expect(standardToCamelot('8A')).toBeUndefined();
    expect(standardToCamelot('11B')).toBeUndefined();
    expect(standardToCamelot('1A')).toBeUndefined();
  });

  it('should return undefined for empty or unrecognised strings', () => {
    expect(standardToCamelot('')).toBeUndefined();
    expect(standardToCamelot('unknown')).toBeUndefined();
    expect(standardToCamelot('Cmaj7')).toBeUndefined();
  });

  it('should handle leading/trailing whitespace', () => {
    expect(standardToCamelot(' Am ')).toBe('8A');
    expect(standardToCamelot(' C ')).toBe('8B');
  });
});

describe('camelotToStandard()', () => {
  it('should convert 8A back to Am', () => {
    expect(camelotToStandard('8A')).toBe('Am');
  });

  it('should convert 8B back to C', () => {
    expect(camelotToStandard('8B')).toBe('C');
  });

  it('should return undefined for empty input', () => {
    expect(camelotToStandard('')).toBeUndefined();
  });

  it('should return undefined for unrecognised input', () => {
    expect(camelotToStandard('13A')).toBeUndefined();
    expect(camelotToStandard('Am')).toBeUndefined();
  });
});

describe('ensureCamelot()', () => {
  it('should convert standard key to Camelot', () => {
    expect(ensureCamelot('Am')).toBe('8A');
    expect(ensureCamelot('C')).toBe('8B');
  });

  it('should return Camelot key unchanged when already Camelot', () => {
    expect(ensureCamelot('8A')).toBe('8A');
    expect(ensureCamelot('11B')).toBe('11B');
  });

  it('should return unrecognised key unchanged (safe fallback)', () => {
    expect(ensureCamelot('unknown')).toBe('unknown');
    expect(ensureCamelot('Cmaj7')).toBe('Cmaj7');
  });

  it('should return empty string unchanged', () => {
    expect(ensureCamelot('')).toBe('');
  });
});

describe('round-trip conversion', () => {
  it('standard → camelot → standard should preserve canonical keys', () => {
    const canonicalKeys = [
      'Am',
      'Em',
      'Bm',
      'F#m',
      'Dbm',
      'Abm',
      'Ebm',
      'Bbm',
      'Fm',
      'Cm',
      'Gm',
      'Dm',
      'C',
      'G',
      'D',
      'A',
      'E',
      'B',
      'F#',
      'Db',
      'Ab',
      'Eb',
      'Bb',
      'F',
    ];
    for (const standard of canonicalKeys) {
      const camelot = standardToCamelot(standard)!;
      expect(camelot, `No Camelot for: ${standard}`).toBeDefined();
      const backToStandard = camelotToStandard(camelot);
      expect(backToStandard, `No round-trip for: ${standard} → ${camelot}`).toBeDefined();
      // The round-trip may produce a different enharmonic spelling but
      // it must also map to the same Camelot key
      expect(standardToCamelot(backToStandard!)).toBe(camelot);
    }
  });
});
