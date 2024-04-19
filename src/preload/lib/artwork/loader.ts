import { Artwork } from '@preload/emusik';
import * as NodeId3 from 'node-id3';

export const LoadArtworkFromFile = async (musicFile: string): Promise<Artwork | null> => {
  return NodeId3.Promise.read(musicFile)
    .then((value: NodeId3.Tags) => {
      const { image } = value;
      let artwork: Artwork;

      if (image && typeof image !== 'string') {
        artwork = {
          mime: image.mime,
          type: { id: image.type.id },
          description: image.description,
          imageBuffer: image.imageBuffer,
        } as Artwork;
        return artwork;
      }

      return null;
    })
    .catch(() => null);
};
