import type { AxiosResponse } from 'axios';

import { mainLogger } from '../log/logger';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleResponse = (response: AxiosResponse<any, any>) => {
  return response;
};

export const handleError = (error: Error) => {
  // eslint-disable-next-line no-console
  mainLogger.error(error);
  throw error;
};
