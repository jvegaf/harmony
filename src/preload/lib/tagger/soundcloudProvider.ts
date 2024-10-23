import Soundcloud, { SoundcloudTrack } from 'soundcloud.ts';

export const search = async (query: string): Promise<SoundcloudTrack[]> => {
  const soundcloud = new Soundcloud();
  const tracks = await soundcloud.tracks.searchAlt(query);
  return tracks;
};
