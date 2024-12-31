import type { AxiosResponse } from 'axios';

import log from 'electron-log';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleResponse = (response: AxiosResponse<any, any>) => {
  return response;
};

export const handleError = (error: Error) => {
  // eslint-disable-next-line no-console
  log.error(error);
  throw error;
};
