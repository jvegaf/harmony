/* eslint-disable import/prefer-default-export */

import { AxiosResponse } from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleResponse = (response: AxiosResponse<any, any>) => {
  return response;
};

export const handleError = (error: Error) => {
  // eslint-disable-next-line no-console
  console.log({ error });
  throw error;
};
