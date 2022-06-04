import fetch from 'node-fetch';
import { Artwork } from '../../../shared/types/emusik';

const GetArtwork = async (url: string): Artwork => {
  url.replace(/[0-9]{3,}x[0-9]{3,}/, '500x500');

  const response = await fetch(url);
  const buffer = await response.buffer();
  return {
    mime: response.headers.get('content-type') || '',
    type: { id: 3, name: 'front cover' },
    description: '',
    imageBuffer: buffer,
  };
};

export default GetArtwork;
