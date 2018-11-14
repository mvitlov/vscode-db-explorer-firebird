import { window, OutputChannel, workspace } from "vscode";
import { Constants } from "../config/constants";

export enum Level {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR"
}

class Logger {
  private logLevel: string;
  private outputChannel: OutputChannel;

  constructor() {
    this.logLevel = Level.INFO;
    this.outputChannel = window.createOutputChannel(Constants.OutputChannel);
  }

  showWarn(msg: any, options?: any) {
    window.showWarningMessage(msg.toString(), ...(options || [])).then(value => {
      if (value === "Show Output") {
        this.showOutput();
      }
    });
  }
  showInfo(msg: any, options?: any) {
    window.showInformationMessage(msg.toString(), ...(options || [])).then(value => {
      if (value === "Show Output") {
        this.showOutput();
      }
    });
  }

  showError(msg: any, options?: any) {
    return window.showErrorMessage(msg.toString(), ...(options || []));
  }

  setLogLevel(logLevel: string) {
    this.logLevel = logLevel;
  }

  debug(...msg: Array<any>) {
    this.log(`${msg.toString()}`, Level.DEBUG);
  }

  info(msg: any) {
    this.log(`${msg.toString()}`, Level.INFO);
  }

  warn(msg: any) {
    this.log(`${msg.toString()}`, Level.WARN);
  }

  error(msg: any) {
    this.log(`${msg.toString()}`, Level.ERROR);
  }

  output(msg: any) {
    this.outputChannel.appendLine(msg.toString());
  }

  showOutput() {
    this.outputChannel.show();
  }

  getOutputChannel(): OutputChannel {
    return this.outputChannel;
  }

  private log(msg: string, level: Level) {
    this.setLogLevel(workspace.getConfiguration().get("firebird.logLevel"));
    const time = new Date().toLocaleTimeString();
    msg = `[${time}][${Constants.Id}][${level}] ${msg}`;
    switch (level) {
      case Level.ERROR:
        console.error(msg);
        break;
      case Level.WARN:
        console.warn(msg);
        break;
      case Level.INFO:
        console.info(msg);
        break;
      default:
        console.log(msg);
        break;
    }
    // log to output channel
    if (this.logLevel && logLevelGreaterThan(level, this.logLevel as Level)) {
      this.output(msg);
    }
  }
}

/**
 * Verify if log level l1 is greater than log level l2
 * DEBUG < INFO < WARN < ERROR
 */
function logLevelGreaterThan(l1: Level, l2: Level) {
  switch (l2) {
    case Level.ERROR:
      return l1 === Level.ERROR;
    case Level.WARN:
      return l1 === Level.WARN || l1 === Level.ERROR;
    case Level.INFO:
      return l1 === Level.INFO || l1 === Level.WARN || l1 === Level.ERROR;
    case Level.DEBUG:
      return true;
    default:
      return l1 === Level.INFO || l1 === Level.WARN || l1 === Level.ERROR;
  }
}

export const logger: Logger = new Logger();
