import gis, { Result } from 'async-g-i-s';
import { BuildGoogleArtworkQuery } from './querybuilder';
import { mainLogger } from '../log/logger';
import { Track } from '../../../preload/types/emusik';

const FindArtwork = async (track: Track): Promise<string[]> => {
  const { title, artist } = track;
  const result: Result[] = [];
  const query = BuildGoogleArtworkQuery(title, artist);
  try {
    const images = await gis(query);
    result.push(...images.filter(i => i.height === i.width));
  } catch (error) {
    mainLogger.warn('error finding artwork', error);
  }

  // if (result.length) log.info('result', result); &tbs=isz:m,iar:s,ift:jpg
  const res = result.map(r => r.url);
  return res;
};

export default FindArtwork;
