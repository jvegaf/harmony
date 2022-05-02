import { Track } from '../../../shared/types/emusik';
import SearchYtTags from './youtube';

const SearchTags = (track: Track) => {
  const { title, artist } = track;

  const ytResults = SearchYtTags(title, artist);
  // eslint-disable-next-line no-console
  console.log(ytResults);
};

export default SearchTags;
