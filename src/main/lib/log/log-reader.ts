import { logger } from './logger';

export const getLogsFromFile = async (filePath: string): Promise<string[]> => {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    return lines;
  } catch (error) {
    logger.error(`Error reading log file: ${error}`);
    return [];
  }
};
