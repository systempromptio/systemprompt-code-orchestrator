/**
 * @file Report task tool definition
 * @module constants/tool/orchestrator/report-task
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool for generating reports on tasks
 */
export const reportTask: Tool = {
  name: 'report_task',
  description: 'Generate reports on task progress and outcomes. Can report on specific tasks or all tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      task_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of task IDs to report on. If empty, reports on all tasks'
      },
      report_type: {
        type: 'string',
        enum: ['summary', 'detailed', 'progress'],
        description: 'Type of report to generate',
        default: 'summary'
      },
      format: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: 'Output format for the report',
        default: 'json'
      }
    }
  }
};