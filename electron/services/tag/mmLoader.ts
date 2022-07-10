import { AppLogger } from '../log/app.logger';
import * as mm from 'music-metadata';
const log = AppLogger.getInstance();

export interface FileTags extends mm.ICommonTagsResult {
  duration?: number;
  bitrate?: number;
}

const LoadTagsFromFile = async (file: string): Promise<FileTags | null> => {
  try {
    const metadata = await mm.parseFile(file);
    return { ...metadata.common, duration: metadata.format.duration, bitrate: metadata.format.bitrate };
  } catch (err) {
    log.error('error in load tags from file');
  }
  return null;
};

export default LoadTagsFromFile;
