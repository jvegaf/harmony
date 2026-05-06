import { Track, TrackRating } from '../../../preload/types/harmony';
import * as utils from './utils';

/**
 * Format a list of tracks to a nice status
 */
export const getStatus = (tracks: Track[]): string => {
  const status = utils.parseDuration(tracks.map(d => d.duration).reduce((a, b) => a + b, 0));
  return `${tracks.length} tracks, ${status}`;
};

export function ratingComparator(valueA: TrackRating | null, valueB: TrackRating | null) {
  const a = valueA && valueA.rating ? valueA.rating : 0;
  const b = valueB && valueB.rating ? valueB.rating : 0;

  if (a === b) {
    return 0;
  }

  if (a === null) {
    return 1;
  }

  if (b === null) {
    return -1;
  }

  return a - b;
}

export const GetFilenameWithoutExtension = (filePath: string): string => {
  const parts = filePath.split(/[/\\]/);
  const filename = parts[parts.length - 1];
  const filenameWithoutExtension = filename.split('.').slice(0, -1).join('.');
  return filenameWithoutExtension;
};

// get parent song folder

export const GetParentFolderName = (filePath: string): string => {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 2];
};

export const formatOpenKey = (key: string | null | undefined): string => {
  if (!key) return '';
  
  const normalized = key.trim().replace(/\s+/g, '');
  
  // Check if already in OpenKey format (e.g., 8m, 12d)
  if (/^([1-9]|1[0-2])[md]$/i.test(normalized)) {
    return normalized.toLowerCase();
  }
  
  // Check if in Camelot format (e.g., 8A, 12B)
  const camelotMatch = normalized.match(/^([1-9]|1[0-2])([ab])$/i);
  if (camelotMatch) {
    const camelotNum = parseInt(camelotMatch[1], 10);
    const openKeyNum = ((camelotNum + 4) % 12) + 1;
    const letter = camelotMatch[2].toLowerCase() === 'a' ? 'm' : 'd';
    return `${openKeyNum}${letter}`;
  }
  
  // Normalize standard musical notation (Am, A min, A minor -> Am)
  let standard = normalized
    .replace(/minor/i, 'm')
    .replace(/min/i, 'm')
    .replace(/major/i, '')
    .replace(/maj/i, '');
    
  // Capitalize note, lowercase accidental/mode
  standard = standard.charAt(0).toUpperCase() + standard.slice(1).toLowerCase();
  
  const keyMapping: Record<string, string> = {
    'Abm': '1m', 'G#m': '1m',
    'Ebm': '2m', 'D#m': '2m',
    'Bbm': '3m', 'A#m': '3m',
    'Fm': '4m',
    'Cm': '5m',
    'Gm': '6m',
    'Dm': '7m',
    'Am': '8m',
    'Em': '9m',
    'Bm': '10m',
    'Gbm': '11m', 'F#m': '11m',
    'Dbm': '12m', 'C#m': '12m',
    
    'B': '1d',
    'Gb': '2d', 'F#': '2d',
    'Db': '3d', 'C#': '3d',
    'Ab': '4d', 'G#': '4d',
    'Eb': '5d', 'D#': '5d',
    'Bb': '6d', 'A#': '6d',
    'F': '7d',
    'C': '8d',
    'G': '9d',
    'D': '10d',
    'A': '11d',
    'E': '12d'
  };
  
  return keyMapping[standard] || key;
};

export const getOpenKeyColor = (openKey: string | null | undefined): string => {
  if (!openKey) return 'transparent';
  
  const formatted = formatOpenKey(openKey);
  const match = formatted.match(/^([1-9]|1[0-2])[md]$/i);
  if (!match) return 'transparent';
  
  const num = parseInt(match[1], 10);
  const hue = (180 - (num - 1) * 30 + 360) % 360;
  
  return `hsl(${hue}, 85%, 55%)`;
};
