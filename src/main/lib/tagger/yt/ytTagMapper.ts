import { ResultTag } from '../../../../preload/types/emusik';
import { mainLogger } from '../../log/logger';

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
  mainLogger.info('yt gettagresult');
  mainLogger.info(result);
  return result.map(track => CreateTagResult(track));
};

export default GetTagResults;
