/**
 * @file Report task handler
 * @module handlers/tools/orchestrator/report-task
 */

import { TaskStore } from '../../../services/task-store.js';
import { logger } from '../../../utils/logger.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { formatToolResponse } from '../types.js';

export interface ReportTaskArgs {
  task_ids?: string[];
  report_type?: 'summary' | 'detailed' | 'progress';
  format?: 'json' | 'markdown';
}

/**
 * Handler for report task tool
 */
export const handleReportTask = async (args: ReportTaskArgs): Promise<CallToolResult> => {
  const {
    task_ids = [],
    report_type = 'summary',
    format = 'json'
  } = args;

  const taskStore = TaskStore.getInstance();
  const report: any = {
    timestamp: new Date().toISOString(),
    report_type,
    tasks: []
  };

  try {
    // Get tasks to report on
    let tasksToReport: any[] = [];
    
    if (task_ids.length > 0) {
      // Get specific tasks
      const taskPromises = task_ids.map((id: string) => taskStore.getTask(id));
      const tasks = await Promise.all(taskPromises);
      tasksToReport = tasks.filter(Boolean);
    } else {
      // Get all tasks
      tasksToReport = await taskStore.getTasks();
    }

    for (const task of tasksToReport) {
      if (!task) continue;

      const taskReport: any = {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        branch: task.branch,
        created_at: task.created_at,
        updated_at: task.updated_at
      };

      if (report_type === 'detailed' || report_type === 'progress') {
        taskReport.description = task.description;
        taskReport.model = task.model;
        taskReport.progress = task.progress;
        taskReport.logs = task.logs || [];
        taskReport.session_id = task.session_id;
        taskReport.commands_executed = task.commands_executed || [];
      }

      if (report_type === 'detailed') {
        taskReport.result = task.result;
        taskReport.summary = task.summary;
        taskReport.requirements = task.requirements || [];
        taskReport.context = task.context;
      }

      report.tasks.push(taskReport);
    }

    // Calculate summary statistics
    const stats = {
      total_tasks: report.tasks.length,
      by_status: {
        pending: report.tasks.filter((t: any) => t.status === 'pending').length,
        in_progress: report.tasks.filter((t: any) => t.status === 'in_progress').length,
        completed: report.tasks.filter((t: any) => t.status === 'completed').length,
        failed: report.tasks.filter((t: any) => t.status === 'failed').length,
        cancelled: report.tasks.filter((t: any) => t.status === 'cancelled').length
      },
      by_model: {
        claude: report.tasks.filter((t: any) => t.model === 'claude').length,
        gemini: report.tasks.filter((t: any) => t.model === 'gemini').length
      }
    };

    report.summary = stats;

    logger.info(`Generated ${report_type} report for ${report.tasks.length} tasks`);

    if (format === 'markdown') {
      // Convert to markdown format
      let markdown = `# Task Report

**Generated:** ${report.timestamp}
**Report Type:** ${report_type}

## Summary
- Total Tasks: ${stats.total_tasks}
- Pending: ${stats.by_status.pending}
- In Progress: ${stats.by_status.in_progress}
- Completed: ${stats.by_status.completed}
- Failed: ${stats.by_status.failed}
- Cancelled: ${stats.by_status.cancelled}

## Tasks\n`;

      for (const task of report.tasks) {
        markdown += `
### ${task.title} (${task.id})
- **Status:** ${task.status}
- **Priority:** ${task.priority}
- **Branch:** ${task.branch}
- **Created:** ${task.created_at}
- **Updated:** ${task.updated_at}`;

        if (task.description) {
          markdown += `\n- **Description:** ${task.description}`;
        }
        if (task.progress !== undefined) {
          markdown += `\n- **Progress:** ${task.progress}%`;
        }
        if (task.summary) {
          markdown += `\n- **Summary:** ${task.summary}`;
        }
        markdown += '\n';
      }

      return formatToolResponse({
        status: 'success',
        message: `Generated ${report_type} report for ${report.tasks.length} tasks`,
        result: markdown
      });
    }

    return formatToolResponse({
      status: 'success', 
      message: `Generated ${report_type} report for ${report.tasks.length} tasks`,
      result: report
    });

  } catch (error) {
    logger.error('Failed to generate task report', { error });
    throw error;
  }
};