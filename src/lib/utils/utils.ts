/**
 * Parse an int to a more readable string
 * AIDEV-NOTE: duration comes from Rust backend in milliseconds, convert to seconds first
 */
export const parseDuration = (duration: number | null): string => {
  if (duration !== null) {
    const totalSeconds = Math.trunc(duration / 1000); // Convert ms to seconds
    const hours = Math.trunc(totalSeconds / 3600);
    const minutes = Math.trunc(totalSeconds / 60) % 60;
    const seconds = totalSeconds % 60;

    const hoursStringified = hours < 10 ? `0${hours}` : hours;
    const minutesStringified = minutes < 10 ? `0${minutes}` : minutes;
    const secondsStringified = seconds < 10 ? `0${seconds}` : seconds;

    let result = hours > 0 ? `${hoursStringified}:` : '';
    result += `${minutesStringified}:${secondsStringified}`;

    return result;
  }

  return '00:00';
};

export const sanitize = (str: string): string => {
  const accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
  const fixes = 'AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz';
  const split = accents.split('').join('|');
  const reg = new RegExp(`(${split})`, 'g');

  function replacement(a: string) {
    return fixes[accents.indexOf(a)] || '';
  }

  return str.replace(reg, replacement).toLowerCase();
};

const getTokens = (strVal: string): string[] => {
  return strVal.toLowerCase().split(' ');
};

export const getStringTokens = (values: string[]): string[] => {
  return values.reduce<string[]>((acc, curr) => acc.concat(getTokens(curr)), []);
};

export const sanitizedTitle = (str: string): string => {
  // Remove content in parentheses that contains remix-related terms
  let result = str.replace(/\s*\([^)]*\)/gi, '');

  // Remove standalone remix terms at the end of the string
  // result = result.replace(/\s+(?:original|extended)?\s*(?:remix|mix|edit|remmix)\s*$/gi, '');

  // Clean up extra whitespace
  result = result.trim().replace(/\s+/g, ' ');

  return result;
};

/**
 * Remove duplicates (realpath) and useless children folders
 * AIDEV-NOTE: Consolidated from src/lib/utils.ts - filters out duplicate paths and nested folders
 */
export const removeUselessFolders = (folders: string[]): string[] => {
  // Remove duplicates
  let filteredFolders = folders.filter((elem, index) => folders.indexOf(elem) === index);

  const foldersToBeRemoved: string[] = [];

  filteredFolders.forEach((folder, i) => {
    filteredFolders.forEach((subfolder, j) => {
      if (subfolder.includes(folder) && i !== j && !foldersToBeRemoved.includes(folder)) {
        foldersToBeRemoved.push(subfolder);
      }
    });
  });

  filteredFolders = filteredFolders.filter(elem => !foldersToBeRemoved.includes(elem));

  return filteredFolders;
};
