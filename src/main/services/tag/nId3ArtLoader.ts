import * as NodeId3 from 'node-id3';
import type { Artwork } from '../../../shared/types/emusik';

const LoadArtworkFromFile = (musicFile: string): Promise<Artwork | undefined> => {
  return NodeId3.Promise.read(musicFile)
    .then((value: NodeId3.Tags) => {
      const { image } = value;
      let artwork;
    
      if(image && typeof image !== 'string'){
        artwork = {
          mime:        image.mime,
          type:        { id: image.type.id, name: image.type.name },
          description: image.description,
          imageBuffer: image.imageBuffer,
        } as Artwork;
      }

      return artwork;
    });
};

export default LoadArtworkFromFile;
