import * as mm from 'music-metadata';
import logger from '../logger';

export interface FileTags extends mm.ICommonTagsResult {
  duration: number;
  bitrate?: number;
}

const LoadTagsFromFile = async (file: string): Promise<FileTags | null> => {
  try {
    const metadata = await mm.parseFile(file);
    return { ...metadata.common, duration: metadata.format.duration || 0, bitrate: metadata.format.bitrate };
  } catch (err) {
    logger.error(err);
    return null;
  }
};

export default LoadTagsFromFile;
