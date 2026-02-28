import { Track, TrackRating } from '@renderer/types/harmony';
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
