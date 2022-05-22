/* eslint-disable no-console */
import { MatchResult, ResultTag, Track } from '../../../shared/types/emusik';
import { GetStringTokens } from '../../../shared/utils';
import Update from '../track/updater';
// import SearchYtTags from './youtube';
import SearchTags from './beatport';
import SearchTrackInfo from './google';

// const SearchTagsYt = (track: Track) => {
//   const { title, artist } = track;

//   const ytResults = SearchYtTags(title, artist);
//   // eslint-disable-next-line no-console
//   console.log(ytResults);
// };

const Match = (trackTokens: string[], tags: ResultTag[]): MatchResult => {
  const tagMatches: MatchResult[] = tags.map((tag) => {
    let tokensFounded = 0;
    trackTokens.forEach((token) => {
      if (tag.tokens.indexOf(token) > -1) {
        tokensFounded += 1;
      }
    });

    return {
      tag,
      trackTokens,
      matches: tokensFounded,
      of: trackTokens.length,
    };
  });

  return tagMatches.sort((a, b) => b.matches - a.matches)[0];
};

const SearchOnBeatport = async (track: Track): Promise<MatchResult | null> => {
  const { title, artist, duration } = track;
  const reqAggregate: string[] = [title];
  if (artist) {
    reqAggregate.push(artist);
  }
  const trackTokens = GetStringTokens(reqAggregate);
  const durRounded = Math.round(duration);
  const bpResults = await SearchTags(title, artist);
  console.log(`TOTAL BP RESULTS: ${bpResults.length}`);
  if (bpResults.length < 1) {
    return null;
  }
  const resultsFiltered = bpResults.filter(
    (result) =>
      result.duration >= durRounded - 10 && result.duration <= durRounded + 10
  );
  console.log(`BP RESULTS FILTERED: ${resultsFiltered.length}`);
  if (resultsFiltered.length < 2) {
    return {
      tag: resultsFiltered[0],
      trackTokens,
      matches: 1,
      of: 1,
    };
  }
  const match = Match(trackTokens, resultsFiltered);
  console.log(`MATCH: ${match.matches} / ${match.of}`);
  return match;
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

const FixTags = async (track: Track): Promise<Track> => {
  const result = await SearchOnBeatport(track);
  if (result === null) {
    GetWebTrackInfo(track);
    return track;
  }
  return Update(track, result.tag);
};

export default FixTags;
