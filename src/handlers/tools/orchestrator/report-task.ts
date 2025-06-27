import { z } from 'zod';
import { TaskStore } from '../../../services/task-store.js';
import { logger } from '../../../utils/logger.js';
import type { ToolHandler } from '../types.js';
import { formatToolResponse } from '../types.js';

const ReportTaskSchema = z.object({
  task_ids: z.array(z.string()).optional().default([]),
  report_type: z.enum(['summary', 'detailed', 'progress']).optional().default('summary'),
  format: z.enum(['json', 'markdown']).optional().default('json')
});

type ReportTaskArgs = z.infer<typeof ReportTaskSchema>;

interface TaskReport {
  id: string;
  title: string;
  status: string;
  priority: string;
  branch: string;
  created_at: string;
  updated_at: string;
  description?: string;
  model?: string;
  progress?: number;
  logs?: string[];
  session_id?: string;
  commands_executed?: string[];
  result?: any;
  summary?: string;
  requirements?: string[];
  context?: any;
}

interface Report {
  timestamp: string;
  report_type: string;
  tasks: TaskReport[];
  summary?: {
    total_tasks: number;
    by_status: Record<string, number>;
    by_model: Record<string, number>;
  };
}

/**
 * Generates comprehensive reports on task progress and outcomes
 * @param args - Report generation parameters
 * @param context - Execution context
 * @returns Formatted report in JSON or Markdown format
 */
export const handleReportTask: ToolHandler<ReportTaskArgs> = async (args, _context) => {
  try {
    const validated = ReportTaskSchema.parse(args);
    const { task_ids, report_type, format } = validated;

    const taskStore = TaskStore.getInstance();
    const report: Report = {
      timestamp: new Date().toISOString(),
      report_type,
      tasks: []
    };

    const tasksToReport = await getTasksForReport(taskStore, task_ids);

    for (const task of tasksToReport) {
      if (!task) continue;
      
      const taskReport = buildTaskReport(task, report_type);
      report.tasks.push(taskReport);
    }

    report.summary = calculateReportStatistics(report.tasks);

    logger.info(`Generated ${report_type} report for ${report.tasks.length} tasks`);

    if (format === 'markdown') {
      const markdown = formatReportAsMarkdown(report, report_type);
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
    if (error instanceof z.ZodError) {
      return formatToolResponse({
        status: 'error',
        message: 'Invalid report parameters',
        error: {
          type: 'validation_error',
          details: error.errors
        }
      });
    }
    
    logger.error('Failed to generate task report', { error });
    return formatToolResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to generate report',
      error: {
        type: 'report_generation_error'
      }
    });
  }
};

/**
 * Retrieves tasks for the report based on provided IDs or all tasks
 */
async function getTasksForReport(taskStore: TaskStore, taskIds: string[]): Promise<any[]> {
  if (taskIds.length > 0) {
    const taskPromises = taskIds.map((id: string) => taskStore.getTask(id));
    const tasks = await Promise.all(taskPromises);
    return tasks.filter(Boolean);
  }
  return taskStore.getTasks();
}

/**
 * Builds a task report object based on the report type
 */
function buildTaskReport(task: any, reportType: string): TaskReport {
  const taskReport: TaskReport = {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    branch: task.branch,
    created_at: task.created_at,
    updated_at: task.updated_at
  };

  if (reportType === 'detailed' || reportType === 'progress') {
    taskReport.description = task.description;
    taskReport.model = task.model;
    taskReport.progress = task.progress;
    taskReport.logs = task.logs || [];
    taskReport.session_id = task.session_id;
    taskReport.commands_executed = task.commands_executed || [];
  }

  if (reportType === 'detailed') {
    taskReport.result = task.result;
    taskReport.summary = task.summary;
    taskReport.requirements = task.requirements || [];
    taskReport.context = task.context;
  }

  return taskReport;
}

/**
 * Calculates summary statistics for the report
 */
function calculateReportStatistics(tasks: TaskReport[]) {
  return {
    total_tasks: tasks.length,
    by_status: {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    },
    by_model: {
      claude: tasks.filter(t => t.model === 'claude').length,
      gemini: tasks.filter(t => t.model === 'gemini').length
    }
  };
}

/**
 * Formats the report as a markdown string
 */
function formatReportAsMarkdown(report: Report, reportType: string): string {
  const stats = report.summary!;
  let markdown = `# Task Report

**Generated:** ${report.timestamp}
**Report Type:** ${reportType}

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

  return markdown;
}