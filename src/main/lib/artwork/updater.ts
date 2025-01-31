import { ArtTrack } from '../../../preload/types/harmony';
import log from 'electron-log';
import FetchArtwork from './fetcher';
import PersistArtwork from './saver';

const UpdateArtwork = async (artTrack: ArtTrack): Promise<void> => {
  const { reqTrack, selectedArtUrl } = artTrack;
  const art = await FetchArtwork(selectedArtUrl as string);

  if (!art) {
    log.warn('Failed to get artwork');
    return;
  }

  PersistArtwork(reqTrack.path, art);
};

export default UpdateArtwork;
