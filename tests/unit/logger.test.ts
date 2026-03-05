import * as fs from 'fs';

import { Logger } from '../../src/logger';

// Mock fs module
jest.mock('fs');

// Mock config
jest.mock('../../src/config', () => ({
  config: {
    paths: {
      logs: '/test/logs',
      screenshots: '/test/screenshots',
    },
    logging: {
      level: 'debug',
    },
  },
}));

describe('Logger', () => {
  let logger: Logger;
  const mockedFs = jest.mocked(fs);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.appendFileSync.mockImplementation(() => undefined);

    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});

    logger = new Logger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create log directories if they do not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _newLogger = new Logger();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/logs', { recursive: true });
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/screenshots', { recursive: true });
    });

    it('should not create directories if they already exist', () => {
      mockedFs.existsSync.mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _newLogger = new Logger();

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should write debug log with correct format', () => {
      const message = 'Debug message';
      const meta = { key: 'value' };

      logger.debug(message, meta);

      expect(mockedFs.appendFileSync).toHaveBeenCalled();
      const logCall = mockedFs.appendFileSync.mock.calls[0];
      const logContent = JSON.parse(logCall[1] as string);

      expect(logContent.level).toBe('debug');
      expect(logContent.message).toBe(message);
      expect(logContent.key).toBe('value');
    });
  });

  describe('info', () => {
    it('should write info log with message', () => {
      const message = 'Info message';

      logger.info(message);

      expect(mockedFs.appendFileSync).toHaveBeenCalled();
      const logCall = mockedFs.appendFileSync.mock.calls[0];
      const logContent = JSON.parse(logCall[1] as string);

      expect(logContent.level).toBe('info');
      expect(logContent.message).toBe(message);
      expect(logContent.timestamp).toBeDefined();
    });

    it('should include metadata in log entry', () => {
      const meta = { userId: '123', action: 'login' };

      logger.info('User action', meta);

      const logCall = mockedFs.appendFileSync.mock.calls[0];
      const logContent = JSON.parse(logCall[1] as string);

      expect(logContent.userId).toBe('123');
      expect(logContent.action).toBe('login');
    });
  });

  describe('warn', () => {
    it('should write warning log', () => {
      logger.warn('Warning message');

      const logCall = mockedFs.appendFileSync.mock.calls[0];
      const logContent = JSON.parse(logCall[1] as string);

      expect(logContent.level).toBe('warn');
      expect(logContent.message).toBe('Warning message');
    });
  });

  describe('error', () => {
    it('should write error log', () => {
      const error = new Error('Test error');

      logger.error('Error occurred', { error: error.message });

      const logCall = mockedFs.appendFileSync.mock.calls[0];
      const logContent = JSON.parse(logCall[1] as string);

      expect(logContent.level).toBe('error');
      expect(logContent.message).toBe('Error occurred');
      expect(logContent.error).toBe('Test error');
    });
  });
});
