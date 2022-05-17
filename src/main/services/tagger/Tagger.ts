/* eslint-disable no-console */
import { TagResult, Track } from '../../../shared/types/emusik';
// import SearchYtTags from './youtube';
import SearchTags from './beatport';
import SearchTrackInfo from './google';

// const SearchTagsYt = (track: Track) => {
//   const { title, artist } = track;

//   const ytResults = SearchYtTags(title, artist);
//   // eslint-disable-next-line no-console
//   console.log(ytResults);
// };

const SearchOnBeatport = async (track: Track): Promise<TagResult[]> => {
  const { title, artist, duration } = track;
  const durRounded = Math.round(duration);
  const bpResults = await SearchTags(title, artist);
  console.log(`TOTAL BP RESULTS: ${bpResults.length}`);
  const resultsFiltered = bpResults.filter(
    (result) =>
      result.duration >= durRounded - 10 && result.duration <= durRounded + 10
  );
  resultsFiltered.sort((a, b) => a.duration - b.duration);
  console.log(`BP RESULTS FILTERED: ${resultsFiltered.length}`);
  return resultsFiltered;
};

const GetWebTrackInfo = async (track: Track): Promise<void> => {
  const { title, artist } = track;
  const { results } = await SearchTrackInfo(title, artist);
  // console.log(result);
  const shazam = results.filter((r) => r.url.includes('shazam.com'));
  console.log('shazam results: ', shazam);
  const yt = results.filter((r) => r.url.includes('music.youtube.com'));
  console.log('yt results: ', yt);
  const traxsource = results.filter((r) => r.url.includes('traxsource.com'));
  console.log('traxsource results: ', traxsource);
};

const FixTags = async (track: Track): Promise<void> => {
  const bpResults = await SearchOnBeatport(track);
  if (bpResults.length < 1) {
    GetWebTrackInfo(track);
  }
  console.log(bpResults);
};

export default FixTags;
