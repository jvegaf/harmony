import { ResultTag } from '../../../shared/types/emusik';
import { GetStringTokens } from '../../../shared/utils';

const CreateTagResult = (result: any): ResultTag => {
  const tagTrackTitle: string = result.mix_name
    ? `${result.name} (${result.mix_name})`
    : result.name;

  const tagTrackArtists: string[] = result.artists.map(
    (artist: any): string => artist.name
  );

  const tagValues = [...tagTrackArtists, result.name];
  if (result.mix_name) {
    tagValues.push(result.mix_name);
  }
  const tagTokens = GetStringTokens(tagValues);

  return {
    id: result.id,
    title: tagTrackTitle,
    key: `${result.key.camelot_number}${result.key.camelot_letter}`,
    artist: tagTrackArtists.join(', '),
    album: result.album,
    year: result.publish_date.substring(0, 4),
    genre: result.genre.name,
    bpm: result.bpm,
    duration: Number((result.length_ms / 1000).toFixed(0)),
    artworkUrl: result.release.image.uri,
    tokens: tagTokens,
  } as ResultTag;
};

const GetTagResults = (result: any[]): ResultTag[] => {
  return result.map((track) => CreateTagResult(track));
};

export default GetTagResults;
