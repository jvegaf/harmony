import { logger } from './logger';
import fs from 'fs';

export const getLogsFromFile = async (filePath: string): Promise<string[]> => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    return lines;
  } catch (error) {
    logger.error(`Error reading log file: ${error}`);
    return [];
  }
};
