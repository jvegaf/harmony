import { ResultTag } from '../../../../preload/types/emusik';
import { GetStringTokens } from '../../../../preload/lib/utils-id3';

interface Result {
  mix_name: string;
  name: string;
  artists?: [{ name: string }];
  id: string;
  key: { camelot_number: string; camelot_letter: string };
  release: { name: string; image: { uri: string } };
  publish_date: string;
  genre: { name: string };
  bpm: number;
  length_ms: number;
}

const CreateTagResult = (result: Result): ResultTag => {
  const tagTrackTitle: string = result.mix_name ? `${result.name} (${result.mix_name})` : result.name;

  const tagTrackArtists: string[] | undefined = result.artists?.map((artist): string => artist.name);

  const tagValues = [...(tagTrackArtists ?? []), result.name];
  if (result.mix_name) {
    tagValues.push(result.mix_name);
  }
  const tagTokens = GetStringTokens(tagValues);

  return {
    id: result.id,
    title: tagTrackTitle,
    key: `${result.key.camelot_number}${result.key.camelot_letter}`,
    artist: tagTrackArtists?.join(', '),
    album: result.release.name,
    year: result.publish_date.substring(0, 4),
    genre: result.genre.name,
    bpm: result.bpm,
    duration: Number((result.length_ms / 1000).toFixed(0)),
    artworkUrl: result.release.image.uri,
    tokens: tagTokens,
  } as ResultTag;
};

const GetTagResults = (result: Result[]): ResultTag[] => {
  return result.map(track => CreateTagResult(track));
};

export default GetTagResults;
