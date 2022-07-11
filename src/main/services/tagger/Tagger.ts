import { MatchResult, ResultTag, Track } from '../../../shared/types/emusik';
import { GetStringTokens } from '../../../shared/utils';
import { log } from '../log/log';
import Update from '../track/updater';
// import SearchYtTags from './youtube';
import SearchTags from './beatport';
// import SearchTrackInfo from './google';

// const SearchTagsYt = (track: Track) => {
//   const { title, artist } = track;

//   const ytResults = SearchYtTags(title, artist);
//   // eslint-disable-next-line no-console
//   log.info(ytResults);
// };

const Match = (trackTokens: string[], tags: ResultTag[]): MatchResult => {
  const tagMatches: MatchResult[] = tags.map(tag => {
    let tokensFounded = 0;
    trackTokens.forEach(token => {
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
  const bpResults = await SearchTags(title, artist);
  if (!bpResults.length) {
    return null;
  }
  if (!duration) {
    const match = Match(trackTokens, bpResults);
    return match;
  }
  const durRounded = Math.round(duration);
  const resultsFiltered = bpResults.filter(
    result => result.duration >= durRounded - 10 && result.duration <= durRounded + 10
  );
  if (resultsFiltered.length < 2) {
    return {
      tag: resultsFiltered[0],
      trackTokens,
      matches: 1,
      of: 1,
    };
  }
  const match = Match(trackTokens, resultsFiltered);
  return match;
};

// const GetWebTrackInfo = async (track: Track): Promise<void> => {
//   const { title, artist } = track;
//   const { results } = await SearchTrackInfo(title, artist);
//   // log.info(result);
//   const shazam = results.filter(r => r.url.includes('shazam.com'));
//   log.info('shazam results: ', shazam);
//   const yt = results.filter(r => r.url.includes('music.youtube.com'));
//   log.info('yt results: ', yt);
//   const traxsource = results.filter(r => r.url.includes('traxsource.com'));
//   log.info('traxsource results: ', traxsource);
// };

const FixTags = async (track: Track): Promise<Track> => {
  let fixedTrack;
  try {
    const result = await SearchOnBeatport(track);
    if (!result) {
      // GetWebTrackInfo(track);
      log.warn(`no match for ${track.title}`);
      fixedTrack = track;
    } else {
      fixedTrack = Update(track, result.tag);
    }
  } catch (error) {
    log.error(`fixing track ${track.title} failed: ${error}`);
    fixedTrack = track;
  }

  return fixedTrack;
};

export const FixTracks = async (tracks: Track[]) => {
  const updated: Array<Promise<Track>> = [];
  tracks.forEach(track => {
    updated.push(FixTags(track));
  });
  return Promise.all(updated);
};

export default FixTags;
