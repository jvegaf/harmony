import { ResultTag, Track } from '@preload/emusik';
import FetchArtwork from '../artwork/fetcher';
import log from 'electron-log/main';
import PersistTrack from '../tag/saver';

const getArtwork = async (url?: string) => {
  if (!url) return undefined;
  const fixedUrl = url.replace(/[0-9]{3,}x[0-9]{3,}/, '500x500');
  const art = await FetchArtwork(fixedUrl);
  if (art === null) return undefined;
  return art;
};

const Update = async (track: Track, tag: ResultTag): Promise<Track> => {
  if (!tag) return track;

  const art = async () => {
    if (!tag.artworkUrl) {
      return undefined;
    }

    const artwork = await getArtwork(tag.artworkUrl);

    return artwork;
  };

  const newTrack = {
    ...track,
    title: tag.title,
    artist: tag.artist,
    album: tag.album,
    year: tag.year ? Number(tag.year) : undefined,
    bpm: tag.bpm,
    // key: tag.key,
    genre: tag.genre,
  };

  const artwork = await art();

  try {
    PersistTrack(newTrack, artwork);
  } catch (error) {
    log.error(error);
  }

  return newTrack;
};

export default Update;
