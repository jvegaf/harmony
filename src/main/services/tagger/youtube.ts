/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import YoutubeMusicApi from 'youtube-music-api';
import { ResultTag } from '../../../shared/types/emusik';
import GetTagResults from './ytTagMapper';

const SearchYtTags = async (title: string, artist: string | null = null): Promise<ResultTag[]> => {
  const api = new YoutubeMusicApi();
  let query = title;
  if (artist !== null) {
    query = `${artist} ${title}`;
  }
  return api
    .initalize()
    .then(() => api.search(query, 'song'))
    .then((result: any) => {
      const { content } = result;
      return GetTagResults(content);
    })
    .catch((err: Error) => {
      console.log(err);
    });
};

export default SearchYtTags;
