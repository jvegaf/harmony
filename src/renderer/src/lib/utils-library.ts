import { Track } from '../../../preload/types/harmony';
import * as utils from './utils';

/**
 * Filter an array of tracks by string
 */
export const filterTracks = (tracks: Track[], search: string): Track[] => {
  // Avoid performing useless searches
  if (search.length === 0) return tracks;

  return tracks.filter(
    track =>
      track.artist?.toString().includes(search) ||
      track.album?.includes(search) ||
      track.genre?.toString().includes(search) ||
      track.title.includes(search),
  );
};

/**
 * Format a list of tracks to a nice status
 */
export const getStatus = (tracks: Track[]): string => {
  const status = utils.parseDuration(tracks.map(d => d.duration).reduce((a, b) => a + b, 0));
  return `${tracks.length} tracks, ${status}`;
};
