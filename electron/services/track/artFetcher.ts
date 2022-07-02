import fetch from 'node-fetch';
import { Artwork } from '../../types/emusik';

const FetchArtwork = async (url: string): Promise<Artwork> => {
  const response = await fetch(url);
  const buf = await response.buffer();

  const artwork: Artwork = {
    mime: response.headers.get('content-type') || undefined,
    type: { id: 3, name: 'front cover' },
    description: '',
    imageBuffer: buf
  };
  return artwork;
};

export default FetchArtwork;
