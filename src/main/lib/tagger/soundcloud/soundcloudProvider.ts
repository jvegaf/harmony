import { Soundcloud, SoundcloudTrack } from 'soundcloud.ts';
import { ResultTag } from '../../../../preload/types/harmony';

export const soundcloudSearch = async (query: string): Promise<ResultTag[]> => {
  const soundcloud = new Soundcloud();
  const result = await soundcloud.tracks.searchAlt(query);
  return result.map(toResultTag);
};

const toResultTag = (sctrack: SoundcloudTrack): ResultTag => {
  return {
    genre: sctrack.genre ?? sctrack.tag_list.split(' ')[0],
    duration: sctrack.duration,
    title: sctrack.title,
    year: sctrack.release_date?.slice(-4),
    art: sctrack.artwork_url,
    artists: sctrack.user ? [sctrack.user.username] : [],
    tokens: sctrack.title.split(' '),
  };
};
