import * as mm from 'music-metadata';
import log from 'electron-log/main';

export interface FileTags extends mm.ICommonTagsResult {
  duration?: number;
  bitrate?: number;
}

const LoadTagsFromFile = async (file: string): Promise<FileTags | null> => {
  try {
    const metadata = await mm.parseFile(file);
    return { ...metadata.common, duration: metadata.format.duration, bitrate: metadata.format.bitrate };
  } catch (err) {
    log.error(err);
    return null;
  }
};

export default LoadTagsFromFile;
