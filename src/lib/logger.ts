export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  path?: string;
  [key: string]: unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private format(level: LogLevel, message: string, context?: LogContext, error?: Error): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          }
        : {})
    };
  }

  private write(log: StructuredLog): void {
    const json = JSON.stringify(log);
    if (log.level === 'ERROR') {
      console.error(json);
    } else if (log.level === 'WARN') {
      console.warn(json);
    } else {
      console.log(json);
    }
  }

  public info(message: string, context?: LogContext): void {
    this.write(this.format('INFO', message, context));
  }

  public warn(message: string, context?: LogContext, error?: Error): void {
    this.write(this.format('WARN', message, context, error));
  }

  public error(message: string, context?: LogContext, error?: Error): void {
    this.write(this.format('ERROR', message, context, error));
  }

  public child(defaultContext: LogContext): LoggerInstance {
    return new LoggerInstance(defaultContext, this);
  }
}

export class LoggerInstance {
  private readonly defaultContext: LogContext;
  private readonly root: Logger;

  constructor(defaultContext: LogContext, root: Logger) {
    this.defaultContext = defaultContext;
    this.root = root;
  }

  public info(message: string, context?: LogContext): void {
    this.root.info(message, { ...this.defaultContext, ...context });
  }

  public warn(message: string, context?: LogContext, error?: Error): void {
    this.root.warn(message, { ...this.defaultContext, ...context }, error);
  }

  public error(message: string, context?: LogContext, error?: Error): void {
    this.root.error(message, { ...this.defaultContext, ...context }, error);
  }
}

export const logger = new Logger();
