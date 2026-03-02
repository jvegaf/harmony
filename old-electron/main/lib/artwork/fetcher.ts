import axios from 'axios';

import { Artwork } from '../../../preload/types/harmony';
import log from 'electron-log';

export default async function FetchArtwork(url: string): Promise<Artwork | null> {
  let artwork: Artwork | null = null;

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    artwork = {
      mime: response.headers['content-type'] || '',
      type: { id: 3 },
      description: 'Front Cover',
      imageBuffer: response.data,
    };
  } catch (error) {
    log.error(error);
  }

  return artwork;
}
