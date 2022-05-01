/* eslint-disable no-console */
import { TagResult } from '../../../shared/types/emusik';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CreateTagResult = (result: any) => {
  return {
    id: result.videoId,
    title: result.name,
    artists: result.artist.name,
    album: result.album.name,
    duration: Number((result.duration / 1000).toFixed(0)),
  } as TagResult;
};

const GetTagResults = (result: any[]) => {
  console.log('yt gettagresult');
  console.log(result);
  return result.map((track) => CreateTagResult(track));
};

export default GetTagResults;
