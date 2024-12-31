import * as NodeId3 from 'node-id3';
import { Artwork } from '../../../preload/types/emusik';
import log from 'electron-log';

const PersistArtwork = (trackPath: string, artwork: Artwork) => {
  const tags = {
    image: artwork,
  } as NodeId3.Tags;

  NodeId3.Promise.update(tags, trackPath)
    .then()
    .catch(reason => log.error('track persist error', reason));
};

export default PersistArtwork;
