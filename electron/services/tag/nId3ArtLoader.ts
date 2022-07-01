import * as NodeId3 from 'node-id3';
import { Artwork } from '../../types/emusik';

const LoadArtworkFromFile = (musicFile: string): Promise<Artwork | undefined> => {
  return NodeId3.Promise.read(musicFile).then((value: NodeId3.Tags) => {
    const { image } = value;
    if (!image) return undefined;

    if (typeof image !== 'string') {
      return {
        mime: image.mime,
        type: { id: image.type.id, name: image.type.name },
        description: image.description,
        imageBuffer: image.imageBuffer
      } as Artwork;
    }
  });
};

export default LoadArtworkFromFile;
