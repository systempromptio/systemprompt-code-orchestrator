/**
 * @file Report task tool definition
 * @module constants/tool/orchestrator/report-task
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool for generating reports on tasks
 */
export const reportTask: Tool = {
  name: 'report',
  description: 'Generate a report on task status. Shows all tasks if no ID provided, or details for a specific task.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Optional task ID. If not provided, shows status of all tasks'
      }
    }
  }
};