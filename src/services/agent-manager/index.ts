/**
 * @file Agent Manager service exports
 * @module services/agent-manager
 */

export { AgentManager } from './agent-manager.js';
export type { AgentManagerEvents } from './agent-manager.js';

export * from './types.js';
export * from './errors.js';
export * from './constants.js';

// Export singleton instance for backward compatibility
import { AgentManager } from './agent-manager.js';
export const agentManager = AgentManager.getInstance();