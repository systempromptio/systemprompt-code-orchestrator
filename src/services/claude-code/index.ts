/**
 * @file Claude Code service exports
 * @module services/claude-code
 */

export { ClaudeCodeService } from './claude-code-service.js';
export type { ClaudeCodeServiceEvents } from './claude-code-service.js';

export * from './types.js';
export * from './errors.js';
export * from './constants.js';

// Export singleton instance for backward compatibility
import { ClaudeCodeService } from './claude-code-service.js';
export const claudeCodeService = ClaudeCodeService.getInstance();