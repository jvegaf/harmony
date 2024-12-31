import { ArtTrack } from '../../../preload/types/emusik';
import { mainLogger } from '../log/logger';
import FetchArtwork from './fetcher';
import PersistArtwork from './saver';

const UpdateArtwork = async (artTrack: ArtTrack): Promise<void> => {
  const { reqTrack, selectedArtUrl } = artTrack;
  const art = await FetchArtwork(selectedArtUrl as string);

  if (!art) {
    mainLogger.warn('Failed to get artwork');
    return;
  }

  PersistArtwork(reqTrack.path, art);
};

export default UpdateArtwork;
