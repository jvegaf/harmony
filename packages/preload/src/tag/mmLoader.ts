import { ICommonTagsResult, parseFile } from 'music-metadata';
import { log } from '../log/log';

export interface FileTags extends ICommonTagsResult {
  duration?: number;
  bitrate?: number;
}

const LoadTagsFromFile = async (file: string): Promise<FileTags | null> => {
  try {
    const metadata = await parseFile(file);
    return { ...metadata.common, duration: metadata.format.duration, bitrate: metadata.format.bitrate };
  } catch (err) {
    log.error({ err });
    return null;
  }
};

export default LoadTagsFromFile;