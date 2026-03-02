import { BeatportClient } from '../tagger/beatport/client';

export const SearchSimilars = async (bpTrackId: number) => {
  const client = BeatportClient.new();
  const response = await client.findSimilar(bpTrackId);
  return response;
};
