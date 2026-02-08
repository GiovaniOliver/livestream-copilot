/**
 * Logging Service for Mobile App
 *
 * Provides structured logging with module-scoped loggers.
 * This is a console wrapper that can be replaced with a proper
 * logging solution (e.g., react-native-logs) in the future.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  module: string;
  enabled: boolean;
}

class Logger {
  private module: string;
  private enabled: boolean;

  constructor(config: LoggerConfig) {
    this.module = config.module;
    this.enabled = config.enabled;
  }

  private format(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.module}]`;

    switch (level) {
      case 'debug':
        console.log(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.format('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.format('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.format('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.format('error', message, ...args);
  }
}

// Logger factory function
export function createLogger(moduleName: string): Logger {
  return new Logger({
    module: moduleName,
    enabled: true,
  });
}

// Pre-configured module loggers
export const logger = createLogger('app');
export const authLogger = createLogger('auth');
export const captureLogger = createLogger('capture');
export const uploadLogger = createLogger('upload');
export const storeLogger = createLogger('store');
export const apiLogger = createLogger('api');
export const obsLogger = createLogger('obs');

// Default export
export default logger;
