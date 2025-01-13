import { ResultTag } from '../../../../preload/types/harmony';
import log from 'electron-log';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CreateTagResult = (result: any) => {
  return {
    id: result.videoId,
    title: result.name,
    artist: result.artist.name,
    album: result.album.name,
    duration: Number((result.duration / 1000).toFixed(0)),
  } as ResultTag;
};

const GetTagResults = (result: any[]) => {
  log.info('yt gettagresult');
  log.info(result);
  return result.map(track => CreateTagResult(track));
};

export default GetTagResults;
