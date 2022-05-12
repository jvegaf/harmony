import { Sanitize } from '../../../shared/utils';

/* eslint-disable import/prefer-default-export */
const DELIMITER = '+';
const SEARCH_TYPE = '&type=tracks';
const ARTIST_FLAG = '&artist_name=';

export const BuildBeatportQuery = (
  title: string,
  artist: string | null = null
): string => {
  const titleQuery = title.replace(/ /g, DELIMITER);
  if (!artist || artist.length < 1) {
    return `${Sanitize(titleQuery)}${SEARCH_TYPE}`;
  }
  const artistQuery = artist.replace(/ /g, DELIMITER);
  return `${Sanitize(titleQuery)}${SEARCH_TYPE}${ARTIST_FLAG}${Sanitize(
    artistQuery
  )}`;
};

export const BuildGoogleQuery = (
  title: string,
  artist: string | null = null
): string => {
  const titleQuery = title.replace(/ /g, DELIMITER);
  if (!artist || artist.length < 1) {
    return `${Sanitize(titleQuery)}`;
  }
  const artistQuery = artist.replace(/ /g, DELIMITER);
  return `${Sanitize(titleQuery)}+${Sanitize(
    artistQuery
  )}`;
};
