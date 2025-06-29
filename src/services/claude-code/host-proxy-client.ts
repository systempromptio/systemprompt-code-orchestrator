/**
 * @file Host proxy client for Claude Code service
 * @module services/claude-code/host-proxy-client
 */

import * as net from 'net';
import type { HostProxyMessage, HostProxyResponse } from './types.js';
import { 
  HostProxyConnectionError, 
  HostProxyTimeoutError,
  HostProxyError 
} from './errors.js';
import {
  DEFAULT_PROXY_HOST,
  DEFAULT_PROXY_PORT,
  HOST_PROXY_TIMEOUT_MS,
  ENV_VARS
} from './constants.js';
import { logger } from '../../utils/logger.js';

export interface HostProxyConfig {
  host?: string;
  port?: number;
  timeout?: number;
}

export class HostProxyClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;

  constructor(config: HostProxyConfig = {}) {
    this.host = config.host || process.env[ENV_VARS.CLAUDE_PROXY_HOST] || DEFAULT_PROXY_HOST;
    this.port = config.port || parseInt(process.env[ENV_VARS.CLAUDE_PROXY_PORT] || String(DEFAULT_PROXY_PORT), 10);
    this.timeout = config.timeout || HOST_PROXY_TIMEOUT_MS;
  }

  /**
   * Maps Docker paths to host paths
   */
  private mapDockerPath(workingDirectory: string): string {
    if (workingDirectory.startsWith('/workspace')) {
      const hostRoot = process.env[ENV_VARS.HOST_FILE_ROOT] || '/var/www/html/systemprompt-coding-agent';
      const mapped = workingDirectory.replace('/workspace', hostRoot);
      logger.info('Mapped Docker path to host', { from: workingDirectory, to: mapped });
      return mapped;
    }
    return workingDirectory;
  }

  /**
   * Executes a command via the host proxy
   */
  async execute(
    prompt: string, 
    workingDirectory: string,
    onStream?: (data: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.info('Connecting to host proxy', { host: this.host, port: this.port });
      
      const hostWorkingDirectory = this.mapDockerPath(workingDirectory);
      const chunks: string[] = [];
      let buffer = '';
      let hasCompleted = false;
      let timeoutId: NodeJS.Timeout;

      const client = net.createConnection({ port: this.port, host: this.host }, () => {
        logger.info('Connected to host proxy');
        
        const message: HostProxyMessage = {
          tool: 'claude',
          command: prompt,
          workingDirectory: hostWorkingDirectory
        };
        
        client.write(JSON.stringify(message));
      });

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        client.destroy();
      };

      client.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: HostProxyResponse = JSON.parse(line);
              
              switch (response.type) {
                case 'stream':
                  if (response.data) {
                    chunks.push(response.data);
                    onStream?.(response.data);
                  }
                  break;
                  
                case 'error':
                  cleanup();
                  reject(new HostProxyError(response.data || 'Unknown host proxy error'));
                  break;
                  
                case 'complete':
                  hasCompleted = true;
                  cleanup();
                  resolve(chunks.join(''));
                  break;
                  
                default:
                  logger.warn('Unknown response type from host proxy', { response });
              }
            } catch (e) {
              logger.error('Failed to parse host proxy response', { error: e, line });
            }
          }
        }
      });

      client.on('error', (err) => {
        if (!hasCompleted) {
          cleanup();
          reject(new HostProxyConnectionError(err.message));
        }
      });

      client.on('close', () => {
        if (!hasCompleted) {
          if (chunks.length > 0) {
            resolve(chunks.join(''));
          } else {
            reject(new HostProxyConnectionError('Connection closed unexpectedly'));
          }
        }
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!hasCompleted) {
          cleanup();
          reject(new HostProxyTimeoutError(this.timeout));
        }
      }, this.timeout);
    });
  }
}