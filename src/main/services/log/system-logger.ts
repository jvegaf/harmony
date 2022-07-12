import type { ElectronLog } from 'electron-log';
import electronlog from 'electron-log';
import path from 'path';

export class SystemLogger{
  public logger: ElectronLog;

  public logFilename: string;

  constructor(public logId: string){
    this.logId       = logId;
    this.logFilename = `${new Date()
      .toISOString()
      .substring(0, 10)
      .replace('-', '')
      .replace('-', '')}.log`;

    this.logger = electronlog.create(logId);

    this.logger.transports.file.resolvePath = () => {
      return path.resolve(__dirname, this.logFilename);
    };

    const isDev = process.env.NODE_ENV === 'development' ? ' [dev]' : '';

    this.logger.transports.file.format    = `[{y}-{m}-{d} {h}:{m}:{s}.{ms}] [{level}]${isDev} {text}`;
    this.logger.transports.console.format = `[{level}] {text}`;
  }

  log(...params: []){
    return this.logger.log(...params);
  }

  info(...params: []){
    return this.logger.info(...params);
  }

  warn(...params: []){
    return this.logger.warn(...params);
  }

  error(...params: []){
    return this.logger.error(...params);
  }

  debug(...params: []){
    return this.logger.debug(...params);
  }

  verbose(...params: []){
    return this.logger.verbose(...params);
  }
}
