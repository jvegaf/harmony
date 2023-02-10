import { search } from 'googlethis';
import { log } from '../log/log';
import { BuildGoogleQuery } from './querybuilder';

const SearchTrackInfo = async(title: string, artist?: string) => {
  const options = {
    page:              0,
    safe:              false, // hide explicit results?
    additional_params: {
      // add additional parameters here, see https://moz.com/blog/the-ultimate-guide-to-the-google-search-parameters and https://www.seoquake.com/blog/google-search-param/
      hl: 'en',
      // site: 'shazam.com',
    },
  };

  const trackQuery = BuildGoogleQuery(title, artist);
  log.info(trackQuery);
  const response = await search(trackQuery, options);

  return response;
};

export default SearchTrackInfo;
