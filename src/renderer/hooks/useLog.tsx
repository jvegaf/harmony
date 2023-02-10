/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogCategory } from '../../shared/types/emusik';

export default function useLog(){
  const info = (...params: any[]) =>
    window.Main.Log(LogCategory.Info, ...params);

  const error = (...params: any[]) =>
    window.Main.Log(LogCategory.Error, ...params);

  const warn = (...params: any[]) =>
    window.Main.Log(LogCategory.Warn, params);

  const debug = (...params: any[]) =>
    window.Main.Log(LogCategory.Debug, ...params);

  const verbose = (...params: any[]) =>
    window.Main.Log(LogCategory.Verbose, ...params);

  return {
    info,
    debug,
    warn,
    error,
    verbose
  };
}
