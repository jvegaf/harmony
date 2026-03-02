/**
 * Key Mapper - Converts between Traktor key notation and standard notation.
 *
 * Traktor uses two key notations:
 * 1. Open Key notation in INFO.KEY: "1m" through "12m" (minor) and "1d" through "12d" (major)
 * 2. Numeric values in MUSICAL_KEY.VALUE: 0-11 (major) and 12-23 (minor)
 */

import { TRAKTOR_KEY_MAP, TRAKTOR_MUSICAL_KEY_VALUES, HARMONY_TO_TRAKTOR_KEY } from '../types/nml-types';

/**
 * Maps Traktor Open Key notation (e.g., "1m", "12d") to standard key notation (e.g., "Am", "F")
 *
 * @param traktorKey - Traktor key string like "1m", "12d"
 * @returns Standard key notation like "Am", "F", or undefined if not found
 */
export function mapTraktorKey(traktorKey: string | undefined | null): string | undefined {
  if (!traktorKey) {
    return undefined;
  }

  // Normalize to lowercase for case-insensitive matching
  const normalizedKey = traktorKey.toLowerCase();

  return TRAKTOR_KEY_MAP[normalizedKey];
}

/**
 * Maps Traktor MUSICAL_KEY.VALUE numeric notation (0-23) to standard key notation
 *
 * @param value - MUSICAL_KEY VALUE string like "0", "21"
 * @returns Standard key notation like "C", "Am", or undefined if not found
 */
export function mapTraktorKeyValue(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return TRAKTOR_MUSICAL_KEY_VALUES[value];
}

/**
 * Maps standard key notation back to Traktor Open Key notation
 *
 * @param harmonyKey - Standard key notation like "Am", "C"
 * @returns Traktor key like "1m", "1d", or undefined if not found
 */
export function mapHarmonyKeyToTraktor(harmonyKey: string | undefined | null): string | undefined {
  if (!harmonyKey) {
    return undefined;
  }

  return HARMONY_TO_TRAKTOR_KEY[harmonyKey];
}
