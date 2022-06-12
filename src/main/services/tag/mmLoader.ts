/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import * as mm from 'music-metadata';

export interface FileTags extends mm.ICommonTagsResult {
  duration: number;
  bitrate: number;
}

const LoadTagsFromFile = async (file: string): Promise<?FileTags> => {
  try {
    const metadata = await mm.parseFile(file);
    return { ...metadata.common, duration: metadata.format.duration, bitrate: metadata.format.bitrate };
  } catch (err) {
    console.error(err);
    return null;
  }
};

export default LoadTagsFromFile;
