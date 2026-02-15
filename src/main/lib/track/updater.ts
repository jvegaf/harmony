import { ResultTag, Track } from '../../../preload/types/harmony';
import log from 'electron-log';
import PersistTrack from './saver';
import FetchArtwork from '../artwork/fetcher';
import PersistArtwork from '../artwork/saver';

const Update = async (track: Track, tag: ResultTag): Promise<Track> => {
  if (!tag) return track;

  // AIDEV-NOTE: Apply tag metadata to track, including label field from providers
  // Label is extracted from Beatport, Traxsource, and Bandcamp when applying tag candidates
  const newTrack = {
    ...track,
    title: tag.title,
    artist: tag.artist ? tag.artist : tag.artists.join(),
    album: tag.album ?? undefined,
    year: (tag.year && Number(tag.year)) || track.year,
    bpm: tag.bpm || track.bpm,
    initialKey: tag.key ?? undefined,
    genre: tag.genre || track.genre,
    label: tag.label ?? undefined,
    url: tag.url ?? track.url,
  };

  try {
    await PersistTrack(newTrack);
    log.info(`art: ${tag.art}`);
    if (!tag.art) return newTrack;
    const artwork = await FetchArtwork(tag.art);
    if (!artwork) {
      log.warn(`Failed to fetch artwork from: ${tag.art}`);
      return newTrack;
    }
    await PersistArtwork(newTrack.path, artwork);
  } catch (error) {
    log.error('update error: ', error);
  }

  return newTrack;
};

export default Update;
