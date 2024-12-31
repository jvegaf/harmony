import * as NodeId3 from 'node-id3';
import { Artwork } from '../../../preload/types/emusik';
import { mainLogger } from '../log/logger';

const PersistArtwork = (trackPath: string, artwork: Artwork) => {
  const tags = {
    image: artwork,
  } as NodeId3.Tags;

  NodeId3.Promise.update(tags, trackPath)
    .then()
    .catch(reason => mainLogger.error('track persist error', reason));
};

export default PersistArtwork;
