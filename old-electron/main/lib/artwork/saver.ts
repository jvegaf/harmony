import * as NodeId3 from 'node-id3';
import { Artwork } from '../../../preload/types/harmony';
import log from 'electron-log';
import { safeId3Update } from '../track/safe-id3-update';

const PersistArtwork = async (trackPath: string, artwork: Artwork): Promise<void> => {
  const tags = {
    image: artwork,
  } as NodeId3.Tags;

  await safeId3Update(tags, trackPath);
  log.info('artwork persisted', trackPath);
};

export default PersistArtwork;
