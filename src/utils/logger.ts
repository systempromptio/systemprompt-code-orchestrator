/**
 * @file Logging utility for the Reddit MCP server
 * @module utils/logger
 * 
 * @remarks
 * This module provides a simple logging interface with different log levels.
 * Debug logging can be enabled by setting the DEBUG environment variable to 'true'.
 * 
 * The logger outputs to console with appropriate prefixes for each level,
 * making it easy to filter and search logs in production environments.
 * 
 * @example
 * ```typescript
 * import { logger } from './utils/logger';
 * 
 * logger.debug('Detailed debugging information', { userId: 'user123' });
 * logger.info('Server started on port', 3000);
 * logger.warn('Rate limit approaching', { remaining: 10 });
 * logger.error('Failed to connect to Reddit API', error);
 * ```
 */

/**
 * Simple logger implementation with multiple log levels.
 * 
 * @remarks
 * The logger provides four log levels:
 * - `debug`: Detailed information for debugging (only shown when DEBUG=true)
 * - `info`: General informational messages
 * - `warn`: Warning messages for potentially problematic situations
 * - `error`: Error messages for failures and exceptions
 * 
 * All log methods accept any number of arguments, which are passed
 * directly to the console methods with appropriate prefixes.
 */
export const logger = {
  /**
   * Logs debug-level messages when DEBUG environment variable is 'true'.
   * 
   * @param args - Any number of arguments to log
   * 
   * @example
   * ```typescript
   * logger.debug('Processing request', { method: 'GET', path: '/api/posts' });
   * ```
   */
  debug: (...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  /**
   * Logs informational messages.
   * 
   * @param args - Any number of arguments to log
   * 
   * @example
   * ```typescript
   * logger.info('User authenticated successfully', userId);
   * ```
   */
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },
  
  /**
   * Logs warning messages for potentially problematic situations.
   * 
   * @param args - Any number of arguments to log
   * 
   * @example
   * ```typescript
   * logger.warn('API rate limit close to threshold', { used: 95, limit: 100 });
   * ```
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  
  /**
   * Logs error messages for failures and exceptions.
   * 
   * @param args - Any number of arguments to log
   * 
   * @example
   * ```typescript
   * logger.error('Failed to fetch Reddit post', error.message, { postId });
   * ```
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  }
};