import type { AxiosResponse } from 'axios';

import log from 'electron-log';

export const handleResponse = (response: AxiosResponse<any, any>) => {
  return response;
};

export const handleError = (error: Error) => {
  log.error(error);
  throw error;
};
