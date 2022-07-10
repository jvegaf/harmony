import { AxiosResponse } from 'axios';
import { AppLogger } from './log/app.logger';
const log = AppLogger.getInstance();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleResponse = (response: AxiosResponse<any, any>) => {
  return response;
};

export const handleError = (error: Error) => {
  // eslint-disable-next-line no-console
  log.error(error.message);
  throw error;
};
