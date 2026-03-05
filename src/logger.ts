import fs from 'fs';
import path from 'path';
import { config } from './config';

export class Logger {
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().split('T')[0];
    this.logFile = path.join(config.paths.logs, `automation-${timestamp}.log`);

    // Ensure directories exist
    if (!fs.existsSync(config.paths.logs)) {
      fs.mkdirSync(config.paths.logs, { recursive: true });
    }
    if (!fs.existsSync(config.paths.screenshots)) {
      fs.mkdirSync(config.paths.screenshots, { recursive: true });
    }
  }

  private write(level: string, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Write to file
    fs.appendFileSync(this.logFile, logLine);

    // Console output with colors
    const colors: Record<string, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m',
    };

    console.log(`${colors[level] || ''}[${level.toUpperCase()}]${colors.reset} ${message}`);
    if (meta && config.logging.level === 'debug') {
      console.log('  Meta:', meta);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (config.logging.level === 'debug') {
      this.write('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }
}

export const logger = new Logger();
