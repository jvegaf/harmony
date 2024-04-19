import { Sanitize } from '../../utils';

const DELIMITER = '+';
const SEARCH_TYPE = '&type=tracks';
const ARTIST_FLAG = '&artist_name=';

export const BuildBeatportQuery = (title: string, artist: string | null = null): string => {
  const titleQuery = title.replace(/ /g, DELIMITER);
  if (!artist || artist.length < 1) {
    return `${Sanitize(titleQuery)}${SEARCH_TYPE}`;
  }
  const artistQuery = artist.replace(/ /g, DELIMITER);
  return `${Sanitize(titleQuery)}${SEARCH_TYPE}${ARTIST_FLAG}${Sanitize(artistQuery)}`;
};

export const BuildGoogleQuery = (title: string, artist?: string): string => {
  const titleQuery = title.replace(/ /g, DELIMITER);
  if (!artist || artist.length < 1) {
    return `${Sanitize(titleQuery)}`;
  }
  const artistQuery = artist.replace(/ /g, DELIMITER);
  return `${Sanitize(titleQuery)}+${Sanitize(artistQuery)}`;
};

export const BuildGoogleArtworkQuery = (title: string, artist?: string): string => {
  const query = BuildGoogleQuery(title, artist);
  return `${query}+cover+art&tbs=isz:m,iar:s,ift:jpg`;
};
