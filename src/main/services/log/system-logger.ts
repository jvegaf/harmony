import type { ElectronLog } from "electron-log";
import electronlog from "electron-log";
import path from "path";

export class SystemLogger {
  public logger: ElectronLog;

  public logFilename: string;

  constructor(public logId: string) {
    this.logId = logId;
    this.logFilename = `${new Date().toISOString().substring(0, 10).replace("-", "").replace("-", "")}.log`;

    this.logger = electronlog.create(logId);

    this.logger.transports.file.resolvePath = () => {
      return path.resolve(__dirname, "../../../../log/", this.logFilename);
    };

    const isDev = process.env.NODE_ENV === "development" ? " [dev]" : "";

    this.logger.transports.file.format = `[{y}-{m}-{d} {h}:{m}:{s}.{ms}] [{level}]${isDev} {text}`;
    this.logger.transports.console.format = `[{level}] {text}`;
  }

  log(...params: any[]) {
    return this.logger.log(...params);
  }

  info(...params: any[]) {
    return this.logger.info(...params);
  }

  warn(...params: any[]) {
    return this.logger.warn(...params);
  }

  error(...params: any[]) {
    return this.logger.error(...params);
  }

  debug(...params: any[]) {
    return this.logger.debug(...params);
  }

  verbose(...params: any[]) {
    return this.logger.verbose(...params);
  }
}
