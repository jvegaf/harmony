import * as NodeId3 from 'node-id3';
import { Artwork } from '../../../preload/types/harmony';
import log from 'electron-log';

const PersistArtwork = async (trackPath: string, artwork: Artwork): Promise<void> => {
  const tags = {
    image: artwork,
  } as NodeId3.Tags;

  await NodeId3.Promise.update(tags, trackPath);
  log.info('artwork persisted', trackPath);
};

export default PersistArtwork;
