/**
 * @file Constants for Claude Code service
 * @module services/claude-code/constants
 */

export const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
export const HOST_PROXY_TIMEOUT_MS = 300000; // 5 minutes
export const SESSION_ID_PREFIX = 'claude_';

export const DEFAULT_PROXY_HOST = 'host.docker.internal';
export const DEFAULT_PROXY_PORT = 9876;

export const DOCKER_WORKSPACE_PATH = '/workspace';

export const ERROR_PATTERNS = {
  CREDIT_BALANCE: 'Credit balance is too low',
  INVALID_API_KEY: 'Invalid API key'
} as const;

export const LOG_PREFIXES = {
  ASSISTANT_MESSAGE: '[ASSISTANT_MESSAGE]',
  TOOL_USE: '[TOOL_USE]',
  STREAM_DATA: '[STREAM_DATA]',
  ERROR: '[ERROR]'
} as const;

export const ENV_VARS = {
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  HOST_FILE_ROOT: 'HOST_FILE_ROOT',
  CLAUDE_PROXY_HOST: 'CLAUDE_PROXY_HOST',
  CLAUDE_PROXY_PORT: 'CLAUDE_PROXY_PORT'
} as const;