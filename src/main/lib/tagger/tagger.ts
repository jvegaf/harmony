import log from 'electron-log';
import type { MatchResult, ResultTag, Track } from '../../../preload/types/harmony';
import { GetStringTokens } from '../../../preload/lib/utils-id3';
import Update from '../track/updater';
import { SearchTags } from './dab/dab.tagger';
import { BeatportCandidate, BeatportClient } from './beatport';
import { Traxsource } from './traxsource/traxsource';

// import { SearchTags } from './beatport/beatport';
// import { BandcampSearchResult, search } from './bandcamp/bandcamp';
// import { soundcloudSearch } from './soundcloud/soundcloudProvider';

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

// const searchOnBandCamp = async (track: Track): Promise<BandcampSearchResult[]> => {
//   const { title, artist } = track;
//   const reqAggregate: string[] = [title];
//   if (artist) {
//     reqAggregate.push(artist);
//   }

//   const result = await search(reqAggregate.join(' '));
//   return result;
// };

// const searchOnSoundCloud = async (track: Track): Promise<MatchResult | null> => {
//   const { title, artist } = track;
//   const reqAggregate: string[] = [title];
//   if (artist) {
//     reqAggregate.push(artist);
//   }

//   const trackTokens = GetStringTokens(reqAggregate);
//   const result = await soundcloudSearch(reqAggregate.join(' '));

//   log.info('Soundcloud results count: ', result.length);
//   log.info('tokens: ', trackTokens);
//   log.info('Soundcloud result: ', result[0]);
//   const match = Match(trackTokens, result);

//   return match;
// };
const SearchOnDab = async (track: Track): Promise<MatchResult | null> => {
  const { title, artist, duration } = track;
  const reqAggregate: string[] = [title];
  if (artist) {
    reqAggregate.push(...artist);
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
    result => result.duration >= durRounded - 10 && result.duration <= durRounded + 10,
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

export const FixTags = async (track: Track): Promise<Track> => {
  try {
    const result = await SearchOnDab(track);
    if (!result) {
      // GetWebTrackInfo(track);
      log.warn(`no match for ${track.title}`);
      return track;
    } else {
      const fixedTrack = Update(track, result.tag);
      log.info(`track ${track.title} fixed`);
      return fixedTrack;
    }
  } catch (error) {
    log.error(`fixing track ${track.title} failed: ${error}`);
  }

  return track;
};

export const FindCandidates = async (track: Track): Promise<BeatportCandidate[]> => {
  const bpClient = new BeatportClient();
  const tsClient = new Traxsource();

  const txsCandidates = await tsClient.searchTracks(track.title, track.artist!);
  txsCandidates.forEach(c => log.info(`TRAXXSOURCE ${c.artists} - ${c.title}`));

  const candidates = await bpClient.searchCandidates(track.title, track.artist!, track.duration, 5, 0.3);
  candidates.forEach(c => log.info(`BEATPORT ${c.title} - Score: ${(c.similarity_score * 100).toFixed(1)}%`));

  return candidates;
};
