import { TagResult } from '../../../shared/types/emusik';

/* eslint-disable @typescript-eslint/no-explicit-any */
const CreateTagResult = (result: any) => {
  const tagTrackTitle: string = result.mix_name
    ? `${result.name} (${result.mix_name})`
    : result.name;

  return {
    id: Number(result.id),
    title: tagTrackTitle,
    key: `${result.key.camelot_number}${result.key.camelot_letter}`,
    artists: result.artists.map((artist: any) => artist.name).join(', '),
    album: result.album,
    year: result.publish_date.substring(0, 4),
    genre: result.genre.name,
    bpm: result.bpm,
    duration: Number((result.length_ms / 1000).toFixed(0)),
  } as TagResult;
};

const GetTagResults = (result: any[]) => {
  return result.map((track) => CreateTagResult(track));
};

export default GetTagResults;
