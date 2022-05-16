/* eslint-disable no-console */
import { Track } from '../../../shared/types/emusik';
// import SearchYtTags from './youtube';
// import SearchTags from './beatport';
import SearchTrackInfo from './google';

// const SearchTagsYt = (track: Track) => {
//   const { title, artist } = track;

//   const ytResults = SearchYtTags(title, artist);
//   // eslint-disable-next-line no-console
//   console.log(ytResults);
// };

const FixTags = async (track: Track) => {
  const { title, artist } = track;
  const result = await SearchTrackInfo(title, artist);
  // console.log(result);
  const shazam = result.results.filter((r) => r.url.includes('shazam.com'));
  console.log(shazam);
  const yt = result.results.filter((r) => r.url.includes('music.youtube.com'));
  console.log(yt);
};

// const FixTags = async (track: Track) => {
//   const { title, artist, duration } = track;
//   const durRounded = Math.round(duration);
//   const bpResults = await SearchTags(title, artist);
//   console.log(bpResults.length);
//   const resultsFiltered = bpResults.filter(
//     (result) =>
//       result.duration >= durRounded - 10 && result.duration <= durRounded + 10
//   );
//   resultsFiltered.sort((a, b) => a.duration - b.duration);
//   console.log(resultsFiltered);
// };

export default FixTags;
