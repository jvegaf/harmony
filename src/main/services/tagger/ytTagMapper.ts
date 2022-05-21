/* eslint-disable no-console */
import { ResultTag } from '../../../shared/types/emusik';

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
  console.log('yt gettagresult');
  console.log(result);
  return result.map((track) => CreateTagResult(track));
};

export default GetTagResults;
