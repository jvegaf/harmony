import axios from 'axios';
import BeatportToken from './BeaportToken';
import { BuildBeatportQuery } from './query-builder';
import GetTagResults from './bpTagMapper';
import { ResultTag } from '@preload/emusik';
import { handleError, handleResponse } from '@preload/reponse';

const URI_BASE = 'https://api.beatport.com/v4/catalog/search/?q=';

let bpToken: BeatportToken | null = null;

const getToken = async () => {
  if (bpToken !== null && bpToken.IsValid()) return bpToken;

  const config = { headers: { Accept: 'application/json' } };

  const response = await axios.get('https://embed.beatport.com/token', config).then(handleResponse).catch(handleError);

  const { data } = response;

  bpToken = new BeatportToken(data.access_token, data.expires_in);

  return bpToken;
};

export const SearchTags = async (
  title: string,
  // duration: number,
  artist: string | null = null,
): Promise<ResultTag[]> => {
  const token = await getToken();

  const query = BuildBeatportQuery(title, artist);

  const uri = `${URI_BASE}${query}`;

  const config = {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token.Value()}`,
    },
  };

  const { data } = await axios.get(uri, config).then(handleResponse).catch(handleError);

  return GetTagResults(data.tracks);
};
