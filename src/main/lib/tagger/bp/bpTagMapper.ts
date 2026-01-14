import { ResultTag } from '../../../../preload/types/harmony';
import { GetStringTokens } from '../../../../preload/lib/utils-id3';

// AIDEV-NOTE: Interface actualizada para manejar respuestas de Beatport API v4
// genre puede ser opcional si la API no lo incluye
interface Result {
  mix_name: string;
  name: string;
  artists?: [{ name: string }];
  id: string;
  key: { camelot_number: string; camelot_letter: string };
  release: { name: string; image: { uri: string } };
  publish_date: string;
  genre?: { name: string };
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

  // AIDEV-NOTE: Si genre no está presente, usamos undefined para que el campo sea opcional
  return {
    id: result.id,
    title: tagTrackTitle,
    key: `${result.key.camelot_number}${result.key.camelot_letter}`,
    artist: tagTrackArtists?.join(', '),
    artists: tagTrackArtists ?? [],
    album: result.release.name,
    year: result.publish_date.substring(0, 4),
    genre: result.genre?.name,
    bpm: result.bpm,
    duration: Number((result.length_ms / 1000).toFixed(0)),
    art: result.release.image.uri,
    tokens: tagTokens,
  };
};

const GetTagResults = (result: Result[]): ResultTag[] => {
  return result.map(track => CreateTagResult(track));
};

export default GetTagResults;
