import { image } from 'googlethis';
import { BuildGoogleArtworkQuery } from './querybuilder';

const FindArtwork = async (title: string, artist?: string): Promise<string[]> => {
  const query = BuildGoogleArtworkQuery(title, artist);

  const images = await image(query, { safe: false });

  const result = images.filter((i) => i.height === i.width);

  // if (result.length) console.log('result', result);
  if (!result.length) return [];
  const res = result.map((r) => r.url);
  return res;
};

export default FindArtwork;
