/**
 * Parse an int to a more readable string
 */
export const ParseDuration = (duration: number | null): string => {
  if (duration !== null){
    const hours   = Math.trunc(duration / 3600);
    const minutes = Math.trunc(duration / 60) % 60;
    const seconds = Math.trunc(duration) % 60;

    const hoursStringified   = hours < 10 ? `0${hours}` : hours;
    const minutesStringified = minutes < 10 ? `0${minutes}` : minutes;
    const secondsStringified = seconds < 10 ? `0${seconds}` : seconds;

    let result = hoursStringified > 0 ? `${hoursStringified}:` : '';
    result    += `${minutesStringified}:${secondsStringified}`;

    return result;
  }

  return '00:00';
};

export const Sanitize = (str: string): string => {
  const accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
  const fixes   = 'AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz';
  const split   = accents.split('')
    .join('|');
  const reg = new RegExp(`(${split})`, 'g');

  function replacement(a: string){
    return fixes[accents.indexOf(a)] || '';
  }

  return str.replace(reg, replacement)
    .toLowerCase();
};

const GetTokens = (strVal: string): string[] => {
  return strVal.toLowerCase()
    .split(' ');
};

export const GetStringTokens = (values: string[]): string[] => {
  return values.reduce<string[]>((acc, curr) => acc.concat(GetTokens(curr)), []);
};

/**
 * Parse an URI, encoding some characters
 */
export const parseUri = (uri: string): string => {
  const root = process.platform === 'win32' ? '' : path.parse(uri).root;

  const location = path
    .resolve(uri)
    .split(path.sep)
    .map((d, i) => (i === 0 ? d : encodeURIComponent(d)))
    .reduce((a, b) => path.join(a, b));

  return `file://${root}${location}`;
};

/**
 * Sort an array of string by ASC or DESC, then remove all duplicates
 */
export const simpleSort = (array: string[], sorting: 'asc' | 'desc'): string[] => {
  if (sorting === 'asc') {
    array.sort((a, b) => (a > b ? 1 : -1));
  } else if (sorting === 'desc') {
    array.sort((a, b) => (b > a ? -1 : 1));
  }

  const result: string[] = [];
  array.forEach((item) => {
    if (!result.includes(item)) result.push(item);
  });

  return result;
};


