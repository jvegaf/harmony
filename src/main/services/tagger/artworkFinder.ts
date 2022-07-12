import gis from 'async-g-i-s';
import { log } from '../log/log';
import { BuildGoogleArtworkQuery } from './querybuilder';

const FindArtwork = async(track: Track): Promise<string[]> => {
  const { title, artist } = track;
  let result;
  const query = BuildGoogleArtworkQuery(title, artist);
  try {
    const images = await gis(query);
    result       = images.filter((i) => i.height === i.width);
  } catch (error){
    log.error('error finding artwork', error);
  }

  // if (result.length) log.info('result', result); &tbs=isz:m,iar:s,ift:jpg
  if (!result.length) return [];
  const res = result.map((r) => r.url);
  return res;
};

export default FindArtwork;
