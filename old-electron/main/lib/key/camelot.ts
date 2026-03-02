/**
 * Camelot Wheel key notation utilities.
 *
 * The Camelot system assigns each musical key a number (1–12) and a letter:
 *   - A = minor keys
 *   - B = major keys
 *
 * This allows DJs to mix harmonically by moving +/- 1 on the wheel or
 * switching between A and B at the same number.
 *
 * Standard notation examples: "Am", "C", "F#m", "Eb"
 * Camelot notation examples:  "8A", "8B", "2A", "5B"
 */

/**
 * Mapping from standard key notation to Camelot Wheel notation.
 * AIDEV-NOTE: Covers all 24 standard keys. Minor keys use the A suffix,
 * major keys use the B suffix. Enharmonic equivalents map to the same Camelot key.
 */
export const STANDARD_TO_CAMELOT: Record<string, string> = {
  // Minor keys (A suffix)
  Abm: '1A',
  'G#m': '1A', // enharmonic of Abm
  Ebm: '2A',
  'D#m': '2A', // enharmonic of Ebm
  Bbm: '3A',
  'A#m': '3A', // enharmonic of Bbm
  Fm: '4A',
  Cm: '5A',
  Gm: '6A',
  Dm: '7A',
  Am: '8A',
  Em: '9A',
  Bm: '10A',
  'F#m': '11A',
  Gbm: '11A', // enharmonic of F#m
  Dbm: '12A',
  'C#m': '12A', // enharmonic of Dbm

  // Major keys (B suffix)
  B: '1B',
  Cb: '1B', // enharmonic of B
  'F#': '2B',
  Gb: '2B', // enharmonic of F#
  Db: '3B',
  'C#': '3B', // enharmonic of Db
  Ab: '4B',
  'G#': '4B', // enharmonic of Ab
  Eb: '5B',
  'D#': '5B', // enharmonic of Eb
  Bb: '6B',
  'A#': '6B', // enharmonic of Bb
  F: '7B',
  C: '8B',
  G: '9B',
  D: '10B',
  A: '11B',
  E: '12B',
};

/**
 * Reverse mapping from Camelot notation to standard key notation.
 * When multiple standard keys map to the same Camelot key (enharmonics),
 * only one canonical entry is kept (the first one encountered).
 */
export const CAMELOT_TO_STANDARD: Record<string, string> = Object.fromEntries(
  Object.entries(STANDARD_TO_CAMELOT)
    .reverse()
    .map(([standard, camelot]) => [camelot, standard]),
);

/** Regex pattern for Camelot notation: 1–12 followed by A or B (case-insensitive) */
const CAMELOT_PATTERN = /^(1[0-2]|[1-9])[AB]$/i;

/**
 * Returns true if the key is already in Camelot notation (e.g., "8A", "11B").
 */
export function isCamelotKey(key: string): boolean {
  return CAMELOT_PATTERN.test(key.trim());
}

/**
 * Returns true if the key appears to be in standard musical notation (e.g., "Am", "C", "F#m").
 */
export function isStandardKey(key: string): boolean {
  return key.trim() in STANDARD_TO_CAMELOT;
}

/**
 * Converts a standard key notation to Camelot Wheel notation.
 *
 * @param key - Standard key string (e.g., "Am", "C", "F#m", "Eb")
 * @returns Camelot notation (e.g., "8A", "8B", "11A", "5B"),
 *          or undefined if the key is unrecognised or already Camelot.
 *
 * @example
 * standardToCamelot("Am")  // → "8A"
 * standardToCamelot("C")   // → "8B"
 * standardToCamelot("F#m") // → "11A"
 * standardToCamelot("8A")  // → undefined (already Camelot)
 * standardToCamelot("")    // → undefined
 */
export function standardToCamelot(key: string): string | undefined {
  if (!key) return undefined;

  const trimmed = key.trim();

  // Already in Camelot format — avoid double-conversion
  if (isCamelotKey(trimmed)) return undefined;

  return STANDARD_TO_CAMELOT[trimmed];
}

/**
 * Converts a Camelot key to standard notation.
 *
 * @param key - Camelot key string (e.g., "8A", "11B")
 * @returns Standard notation (e.g., "Am", "F#"), or undefined if unrecognised.
 */
export function camelotToStandard(key: string): string | undefined {
  if (!key) return undefined;

  const trimmed = key.trim().toUpperCase();
  return CAMELOT_TO_STANDARD[trimmed];
}

/**
 * Converts a key to Camelot format if it is in standard notation.
 * If the key is already Camelot, returns it unchanged.
 * If unrecognised, returns the original key unchanged.
 *
 * This is the safe variant to use when you want to "ensure Camelot" without
 * losing data for keys that don't match the known mapping.
 *
 * @example
 * ensureCamelot("Am")  // → "8A"
 * ensureCamelot("8A")  // → "8A"  (already Camelot, returned as-is)
 * ensureCamelot("??")  // → "??"  (unrecognised, returned as-is)
 */
export function ensureCamelot(key: string): string {
  if (!key) return key;

  const trimmed = key.trim();
  if (isCamelotKey(trimmed)) return trimmed;

  return STANDARD_TO_CAMELOT[trimmed] ?? trimmed;
}
