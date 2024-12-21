import axios from 'axios';

import { Artwork } from '../../../preload/types/emusik';
import mainLogger from '../log/logger';

export default async function FetchArtwork(
  url: string,
): Promise<Artwork | null> {
  let artwork: Artwork | null = null;

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    artwork = {
      mime: response.headers['content-type'] || '',
      type: { id: 3, name: 'Front Cover' },
      description: 'Front Cover',
      imageBuffer: response.data,
    };
  } catch (error) {
    mainLogger.error(error);
  }

  return artwork;
}
