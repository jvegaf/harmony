import { ConsoleForElectron } from 'winston-console-for-electron';
import * as winston from 'winston';

export class AppLogger {
  private static _instance: AppLogger;

  public static getInstance(): AppLogger {
    if (this._instance == null) {
      this._instance = new AppLogger();
    }

    return this._instance;
  }

  private _logger;
  private constructor() {
    this._logger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [
        new winston.transports.File({
          filename: 'combined.log',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: 'MM-DD-YYYY HH:mm:ss'
            }),
            winston.format.printf((info) => `${info.timestamp}: ${info.message}`)
          )
        }),
        new ConsoleForElectron({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: 'MM-DD-YYYY HH:mm:ss'
            }),
            winston.format.printf((info) => `${info.timestamp}: ${info.message}`)
          )
        })
      ]
    });
  }

  public info(msg: string) {
    this._logger.log('info', msg);
  }

  public error(msg: string) {
    this._logger.log('error', msg);
  }

  public debug(msg: string) {
    this._logger.log('debug', msg);
  }
}
