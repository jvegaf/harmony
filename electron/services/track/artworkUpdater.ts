import { ArtTrack, Track } from '../../types/emusik';
import PersistTrack from '../tag/nodeId3Saver';
import FetchArtwork from './artFetcher';

const UpdateArtwork = async (artTrack: ArtTrack): Promise<Track> => {
  const { reqTrack, selectedArtUrl } = artTrack;
  const art = await FetchArtwork(selectedArtUrl as string);

  const newTrack = {
    ...reqTrack,
    artwork: art
  };

  try {
    await PersistTrack(newTrack);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return newTrack;
};

export default UpdateArtwork;
