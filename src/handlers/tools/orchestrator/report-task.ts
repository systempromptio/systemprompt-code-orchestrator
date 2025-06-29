/**
 * @file Report task orchestrator tool
 * @module handlers/tools/orchestrator/report-task
 */

import type { ToolHandler, CallToolResult, ToolHandlerContext } from '../types.js';
import { formatToolResponse } from '../types.js';
import { logger } from '../../../utils/logger.js';
import {
  ReportTaskArgsSchema,
  type ReportTaskArgs,
  type Task
} from './utils/index.js';
import {
  validateInput,
  taskOperations
} from './utils/index.js';

/**
 * Task report with configurable detail level
 */
interface TaskReport {
  id: string;
  title: string;
  status: string;
  priority: string;
  branch: string;
  created_at: string;
  updated_at: string;
  duration_seconds?: number;
  duration_human?: string;
  description?: string;
  preferred_agent?: string;
  progress?: number;
  logs_count?: number;
  recent_logs?: string[];
  session_id?: string;
  error?: string;
  result?: any;
  git_operations?: number;
  execution_metrics?: {
    started_at?: string;
    completed_at?: string;
    elapsed_seconds: number;
    status_changes: number;
    error_count: number;
    warning_count: number;
  };
}

/**
 * Complete report structure
 */
interface TaskReportResult {
  report_id: string;
  timestamp: string;
  format: string;
  task_count: number;
  tasks: TaskReport[];
  statistics: {
    total_tasks: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_tool: Record<string, number>;
    average_duration_seconds: number;
    total_logs: number;
    success_rate: number;
  };
  markdown?: string;
}

/**
 * Generates comprehensive reports on task progress and outcomes
 * 
 * @param args - Report generation parameters
 * @param context - Execution context containing session information
 * @returns Formatted report in requested format
 * 
 * @example
 * ```typescript
 * await handleReportTask({
 *   task_ids: ["task_123", "task_456"],
 *   format: "markdown"
 * });
 * ```
 */
export const handleReportTask: ToolHandler<ReportTaskArgs> = async (
  args: unknown,
  context?: ToolHandlerContext
): Promise<CallToolResult> => {
  try {
    // Validate input
    const validated = validateInput(ReportTaskArgsSchema, args);
    
    logger.info('Generating task report', {
      taskCount: validated.task_ids?.length ?? 0,
      format: validated.format ?? 'markdown',
      sessionId: context?.sessionId
    });
    
    // Get tasks for report
    const tasks = await getTasksForReport(validated.task_ids ?? []);
    
    if (tasks.length === 0) {
      return formatToolResponse({
        message: 'No tasks found for report',
        result: validated.format === 'markdown' 
          ? '# Task Report\n\nNo tasks found.' 
          : {
              report_id: `report_${Date.now()}`,
              timestamp: new Date().toISOString(),
              format: validated.format ?? 'markdown',
              task_count: 0,
              tasks: [],
              statistics: createEmptyStatistics()
            }
      });
    }
    
    // Build task reports
    const taskReports = await Promise.all(
      tasks.map(task => buildTaskReport(task, validated.format ?? 'markdown'))
    );
    
    // Calculate statistics
    const statistics = calculateStatistics(tasks, taskReports);
    
    // Create report result
    const reportResult: TaskReportResult = {
      report_id: `report_${Date.now()}`,
      timestamp: new Date().toISOString(),
      format: validated.format ?? 'markdown',
      task_count: tasks.length,
      tasks: taskReports,
      statistics
    };
    
    logger.info('Task report generated', {
      reportId: reportResult.report_id,
      taskCount: tasks.length,
      format: validated.format
    });
    
    // Return based on format
    if (validated.format === 'markdown') {
      const markdown = formatReportAsMarkdown(reportResult);
      return formatToolResponse({
        message: `Generated markdown report for ${tasks.length} task(s)`,
        result: markdown
      });
    } else if (validated.format === 'summary') {
      const summary = formatReportAsSummary(reportResult);
      return formatToolResponse({
        message: `Generated summary report for ${tasks.length} task(s)`,
        result: summary
      });
    } else {
      return formatToolResponse({
        message: `Generated JSON report for ${tasks.length} task(s)`,
        result: reportResult
      });
    }
    
  } catch (error) {
    logger.error('Failed to generate task report', { error, args });
    
    return formatToolResponse({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to generate report',
      error: {
        type: 'report_generation_error',
        details: error instanceof Error ? error.stack : undefined
      }
    });
  }
};

/**
 * Retrieves tasks for the report
 */
async function getTasksForReport(taskIds: string[]): Promise<Task[]> {
  if (taskIds.length === 0) {
    // Get all tasks
    return await taskOperations.taskStore.getTasks();
  }
  
  // Get specific tasks
  const tasks = await Promise.all(
    taskIds.map(id => taskOperations.taskStore.getTask(id))
  );
  
  return tasks.filter((task): task is Task => task !== null);
}

/**
 * Builds a detailed task report
 */
async function buildTaskReport(
  task: Task,
  format: 'json' | 'markdown' | 'summary'
): Promise<TaskReport> {
  const logs = await taskOperations.taskStore.getTaskLogs(task.id);
  const duration = calculateTaskDuration(task);
  
  const report: TaskReport = {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: 'medium', // Default priority since we removed it from Task
    branch: task.branch,
    created_at: task.created_at,
    updated_at: task.updated_at,
    duration_seconds: Math.floor(duration / 1000),
    duration_human: formatDuration(duration)
  };
  
  // Add details for non-summary formats
  if (format !== 'summary') {
    report.description = task.description;
    report.preferred_agent = task.tool === 'CLAUDECODE' ? 'claude' : 'gemini';
    report.progress = calculateProgress(task);
    report.logs_count = logs.length;
    report.recent_logs = logs.slice(-10); // Last 10 logs
    report.session_id = task.assigned_to ?? undefined;
    report.error = task.error;
    report.result = task.result;
    
    // Calculate execution metrics
    const gitOps = logs.filter(log => log.includes('[GIT')).length;
    const errorCount = logs.filter(log => log.includes('[ERROR]')).length;
    const warningCount = logs.filter(log => log.includes('[WARNING]')).length;
    const statusChanges = logs.filter(log => log.includes('[STATUS_CHANGE]')).length;
    
    report.git_operations = gitOps;
    report.execution_metrics = {
      started_at: task.started_at,
      completed_at: task.completed_at,
      elapsed_seconds: Math.floor(duration / 1000),
      status_changes: statusChanges,
      error_count: errorCount,
      warning_count: warningCount
    };
  }
  
  return report;
}

/**
 * Calculates task duration in milliseconds
 */
function calculateTaskDuration(task: Task): number {
  if (!task.started_at) {
    return 0;
  }
  
  const start = new Date(task.started_at).getTime();
  const end = task.completed_at 
    ? new Date(task.completed_at).getTime()
    : Date.now();
    
  return end - start;
}

/**
 * Calculates task progress percentage
 */
function calculateProgress(task: Task): number {
  const duration = calculateTaskDuration(task);
  
  switch (task.status) {
    case 'completed':
      return 100;
    case 'failed':
    case 'cancelled':
      return Math.floor(duration / 1000) > 0 ? 50 : 0;
    case 'in_progress':
      // Estimate based on elapsed time (cap at 90%)
      const estimatedMinutes = 5; // Default estimate
      const elapsedMinutes = Math.floor(duration / 60000);
      return Math.min(90, Math.floor((elapsedMinutes / estimatedMinutes) * 90));
    case 'pending':
    default:
      return 0;
  }
}

/**
 * Calculates report statistics
 */
function calculateStatistics(tasks: Task[], reports: TaskReport[]): TaskReportResult['statistics'] {
  const byStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byPriority = tasks.reduce((acc, _task) => {
    const priority = 'medium'; // Default priority
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byTool = tasks.reduce((acc, task) => {
    const tool = task.tool;
    acc[tool] = (acc[tool] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalDuration = reports.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
  const totalLogs = reports.reduce((sum, r) => sum + (r.logs_count || 0), 0);
  
  return {
    total_tasks: tasks.length,
    by_status: byStatus,
    by_priority: byPriority,
    by_tool: byTool,
    average_duration_seconds: tasks.length > 0 ? totalDuration / tasks.length : 0,
    total_logs: totalLogs,
    success_rate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0
  };
}

/**
 * Creates empty statistics object
 */
function createEmptyStatistics(): TaskReportResult['statistics'] {
  return {
    total_tasks: 0,
    by_status: {},
    by_priority: {},
    by_tool: {},
    average_duration_seconds: 0,
    total_logs: 0,
    success_rate: 0
  };
}

/**
 * Formats the report as markdown
 */
function formatReportAsMarkdown(report: TaskReportResult): string {
  const stats = report.statistics;
  let markdown = `# Task Report

**Report ID:** ${report.report_id}  
**Generated:** ${new Date(report.timestamp).toLocaleString()}  
**Total Tasks:** ${report.task_count}

## Summary Statistics

### By Status
${Object.entries(stats.by_status).map(([status, count]) => 
  `- **${status}:** ${count} (${((count / stats.total_tasks) * 100).toFixed(1)}%)`
).join('\n')}

### By Priority
${Object.entries(stats.by_priority).map(([priority, count]) => 
  `- **${priority}:** ${count}`
).join('\n')}

### By Tool
${Object.entries(stats.by_tool).map(([tool, count]) => 
  `- **${tool}:** ${count}`
).join('\n')}

### Performance
- **Success Rate:** ${stats.success_rate.toFixed(1)}%
- **Average Duration:** ${formatDuration(stats.average_duration_seconds * 1000)}
- **Total Logs:** ${stats.total_logs}

## Task Details
`;

  for (const task of report.tasks) {
    const statusIcon = getStatusIcon(task.status);
    markdown += `
### ${statusIcon} ${task.title}

**ID:** ${task.id}  
**Status:** ${task.status}  
**Priority:** ${task.priority}  
**Branch:** ${task.branch}  
**Duration:** ${task.duration_human}  
**Tool:** ${task.preferred_agent === 'claude' ? 'Claude Code' : 'Gemini CLI'}

`;

    if (task.description) {
      markdown += `**Description:** ${task.description}\n\n`;
    }
    
    if (task.error) {
      markdown += `**Error:** \`\`\`\n${task.error}\n\`\`\`\n\n`;
    }
    
    if (task.execution_metrics) {
      markdown += `**Metrics:**
- Git Operations: ${task.git_operations}
- Status Changes: ${task.execution_metrics.status_changes}
- Errors: ${task.execution_metrics.error_count}
- Warnings: ${task.execution_metrics.warning_count}

`;
    }
    
    if (task.recent_logs && task.recent_logs.length > 0) {
      markdown += `<details>
<summary>Recent Logs (${task.logs_count} total)</summary>

\`\`\`
${task.recent_logs.join('\n')}
\`\`\`

</details>

`;
    }
  }
  
  return markdown;
}

/**
 * Formats the report as a summary
 */
function formatReportAsSummary(report: TaskReportResult): string {
  const lines: string[] = [
    `Task Report Summary (${report.task_count} tasks)`,
    `Generated: ${new Date(report.timestamp).toLocaleString()}`,
    '',
    'Status Distribution:',
    ...Object.entries(report.statistics.by_status).map(([status, count]) => 
      `  ${status}: ${count}`
    ),
    '',
    `Success Rate: ${report.statistics.success_rate.toFixed(1)}%`,
    `Average Duration: ${formatDuration(report.statistics.average_duration_seconds * 1000)}`,
    '',
    'Tasks:'
  ];
  
  for (const task of report.tasks) {
    const statusIcon = getStatusIcon(task.status);
    lines.push(`  ${statusIcon} [${task.id}] ${task.title} (${task.duration_human})`);
  }
  
  return lines.join('\n');
}

/**
 * Gets status icon for markdown
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '⏹️';
    case 'in_progress': return '🔄';
    case 'pending': return '⏳';
    default: return '❓';
  }
}

/**
 * Formats duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}