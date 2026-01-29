/**
 * Cue Mapper
 *
 * Maps between Traktor CUE_V2 entries and Harmony CuePoint objects.
 *
 * AIDEV-NOTE: Traktor cue types:
 * - 0 = Hot Cue (jump marker)
 * - 1 = Fade-in
 * - 2 = Fade-out
 * - 3 = Load (default position)
 * - 4 = Grid (beatgrid marker)
 * - 5 = Loop (has length)
 *
 * Positions are in milliseconds in both systems.
 */

import type { TraktorCue } from '../types/nml-types';
import type { CuePoint, BeatGrid } from '../../../../preload/types/cue-point';
import { CueType } from '../../../../preload/types/cue-point';

/**
 * Map Traktor TYPE string to Harmony CueType.
 *
 * @param typeStr - Traktor TYPE value ("0"-"5")
 * @returns Harmony CueType
 */
export function mapTraktorCueType(typeStr: string): CueType {
  switch (typeStr) {
    case '0':
      return CueType.HOT_CUE;
    case '1':
      return CueType.FADE_IN;
    case '2':
      return CueType.FADE_OUT;
    case '3':
      return CueType.LOAD;
    case '4':
      return CueType.GRID;
    case '5':
      return CueType.LOOP;
    default:
      return CueType.HOT_CUE;
  }
}

/**
 * Map Harmony CueType to Traktor TYPE string.
 *
 * @param type - Harmony CueType
 * @returns Traktor TYPE value
 */
function mapHarmonyCueType(type: CueType): string {
  switch (type) {
    case CueType.HOT_CUE:
      return '0';
    case CueType.FADE_IN:
      return '1';
    case CueType.FADE_OUT:
      return '2';
    case CueType.LOAD:
      return '3';
    case CueType.GRID:
      return '4';
    case CueType.LOOP:
      return '5';
    default:
      return '0';
  }
}

/**
 * Generate a unique ID for a cue point.
 *
 * @param trackId - Parent track ID
 * @param position - Position in ms
 * @param type - Cue type
 * @param hotcueSlot - Optional hotcue slot number (needed for uniqueness when multiple cues at same position)
 * @returns Unique cue ID
 */
export function generateCueId(trackId: string, position: number, type: CueType, hotcueSlot?: number): string {
  // Include hotcueSlot in hash to ensure uniqueness for cues at same position with different slots
  const input = `${trackId}-${position}-${type}-${hotcueSlot ?? 'none'}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `cue-${Math.abs(hash).toString(36)}`;
}

/**
 * Map a single Traktor CUE_V2 to a Harmony CuePoint.
 *
 * @param traktorCue - Traktor cue data
 * @param trackId - Parent track ID
 * @returns Harmony CuePoint
 */
export function mapTraktorCueToHarmony(traktorCue: TraktorCue, trackId: string): CuePoint {
  const type = mapTraktorCueType(traktorCue.TYPE);
  const positionMs = parseFloat(traktorCue.START);
  // Parse hotcueSlot early to include in ID generation for uniqueness
  const hotcueSlot = traktorCue.HOTCUE ? parseInt(traktorCue.HOTCUE, 10) : undefined;

  const cue: CuePoint = {
    id: generateCueId(trackId, positionMs, type, hotcueSlot),
    trackId,
    type,
    positionMs,
  };

  // Optional fields
  if (traktorCue.NAME && traktorCue.NAME !== 'n.n.') {
    cue.name = traktorCue.NAME;
  }

  if (traktorCue.LEN) {
    const length = parseFloat(traktorCue.LEN);
    if (length > 0) {
      cue.lengthMs = length;
    }
  }

  if (hotcueSlot !== undefined && !isNaN(hotcueSlot)) {
    cue.hotcueSlot = hotcueSlot;
  }

  if (traktorCue.DISPL_ORDER) {
    const order = parseInt(traktorCue.DISPL_ORDER, 10);
    if (!isNaN(order)) {
      cue.order = order;
    }
  }

  return cue;
}

/**
 * Map Traktor CUE_V2 data (single or array) to Harmony CuePoints.
 *
 * @param cueData - Traktor CUE_V2 (single cue, array, or undefined)
 * @param trackId - Parent track ID
 * @returns Array of Harmony CuePoints
 */
export function mapTraktorCuesToHarmony(cueData: TraktorCue | TraktorCue[] | undefined, trackId: string): CuePoint[] {
  if (!cueData) return [];

  const cues = Array.isArray(cueData) ? cueData : [cueData];
  return cues.map(cue => mapTraktorCueToHarmony(cue, trackId));
}

/**
 * Extract beatgrid information from a GRID cue and BPM.
 *
 * @param traktorCue - Traktor cue (should be TYPE=4)
 * @param bpmStr - BPM value from TEMPO
 * @returns BeatGrid or undefined if not a grid cue
 */
export function extractBeatGrid(traktorCue: TraktorCue, bpmStr: string): BeatGrid | undefined {
  if (traktorCue.TYPE !== '4') return undefined;

  const firstBeatMs = parseFloat(traktorCue.START);
  const bpm = Math.round(parseFloat(bpmStr));

  if (isNaN(firstBeatMs) || isNaN(bpm)) return undefined;

  return {
    firstBeatMs,
    bpm,
    isManual: traktorCue.NAME !== 'AutoGrid',
  };
}

/**
 * Map a Harmony CuePoint to Traktor CUE_V2 format.
 *
 * @param cue - Harmony CuePoint
 * @returns Traktor CUE_V2 data
 */
export function mapHarmonyCueToTraktor(cue: CuePoint): TraktorCue {
  // Format position with 6 decimal places to match Traktor format
  const formatPosition = (ms: number): string => ms.toFixed(6);

  const traktor: TraktorCue = {
    TYPE: mapHarmonyCueType(cue.type),
    START: formatPosition(cue.positionMs),
    LEN: formatPosition(cue.lengthMs ?? 0),
    REPEATS: '-1',
    DISPL_ORDER: String(cue.order ?? 0),
  };

  if (cue.name) {
    traktor.NAME = cue.name;
  }

  if (cue.hotcueSlot !== undefined) {
    traktor.HOTCUE = String(cue.hotcueSlot);
  }

  return traktor;
}
