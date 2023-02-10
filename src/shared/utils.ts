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
