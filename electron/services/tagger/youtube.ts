/* eslint-disable @typescript-eslint/no-explicit-any */
import YoutubeMusicApi from 'youtube-music-api';
import { ResultTag } from '../../types/emusik';
import log from 'electron-log';
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
      log.info(err);
    });
};

export default SearchYtTags;
