import log from 'electron-log';
import { ArtTrack, Track } from '../../types/emusik';
import PersistTrack from '../tag/nodeId3Saver';
import FetchArtwork from './artwork.fetcher';

const UpdateArtwork = async (artTrack: ArtTrack): Promise<Track> => {
  const { reqTrack, selectedArtUrl } = artTrack;
  const art = await FetchArtwork(selectedArtUrl as string);

  const newTrack = {
    ...reqTrack,
    artwork: art !== null ? art : undefined
  };

  try {
    await PersistTrack(newTrack);
  } catch (error) {
    log.error(error);
  }

  return newTrack;
};

export default UpdateArtwork;
