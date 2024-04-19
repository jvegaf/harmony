import FetchArtwork from './fetcher';
import log from 'electron-log/main';
import PersistTrack from '../tag/saver';
import { ArtTrack } from '@preload/emusik';

const UpdateArtwork = async (artTrack: ArtTrack): Promise<void> => {
  const { reqTrack, selectedArtUrl } = artTrack;
  const art = await FetchArtwork(selectedArtUrl as string);

  if (!art) {
    log.warn('Failed to get artwork');
    return;
  }

  PersistTrack(reqTrack, art);
};

export default UpdateArtwork;
