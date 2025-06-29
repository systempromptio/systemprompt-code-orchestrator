/**
 * @file Task management utilities for orchestrator tools
 * @module handlers/tools/orchestrator/utils/task
 */

import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from '../../../../services/task-store.js';
import { logger } from '../../../../utils/logger.js';
import type { Task, TaskStatus, AITool, createTaskId, UpdateTaskParams } from '../../../../types/task.js';

export interface TaskCreationParams {
  title: string;
  description: string;
  tool: AITool;
  branch: string;
  projectPath: string;
}

export interface TaskReport {
  task: Task;
  duration: string;
  logCount: number;
  summary: string;
}

/**
 * High-level utilities for task management
 */
export class TaskOperations {
  public readonly taskStore: TaskStore;
  
  constructor(taskStore?: TaskStore) {
    this.taskStore = taskStore || TaskStore.getInstance();
  }
  
  /**
   * Creates a new task
   */
  async createTask(
    params: TaskCreationParams,
    sessionId?: string
  ): Promise<Task> {
    const taskId = `task_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const task: Task = {
      id: taskId as ReturnType<typeof createTaskId>,
      title: params.title,
      description: params.description,
      tool: params.tool,
      branch: params.branch,
      status: 'pending',
      created_at: now,
      updated_at: now,
      logs: [`Task created with ${params.tool} tool`]
    };
    
    await this.taskStore.createTask(task, sessionId);
    logger.info('Task created', { taskId, title: task.title, tool: params.tool });
    
    return task;
  }
  
  /**
   * Updates task status with validation
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    sessionId?: string,
    metadata?: {
      error?: string;
      result?: unknown;
      completedAt?: string;
    }
  ): Promise<Task | null> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      logger.warn('Task not found for status update', { taskId });
      return null;
    }
    
    // Validate state transitions
    if (!this.isValidStatusTransition(task.status, newStatus)) {
      logger.warn('Invalid status transition', {
        taskId,
        from: task.status,
        to: newStatus
      });
      throw new Error(`Cannot transition from ${task.status} to ${newStatus}`);
    }
    
    // Build updates object based on status
    const updates: UpdateTaskParams = { 
      status: newStatus
    };
    
    // Add status-specific updates
    switch (newStatus) {
      case 'in_progress':
        if (!task.started_at) {
          updates.started_at = new Date().toISOString();
        }
        break;
        
      case 'completed':
      case 'failed':
      case 'cancelled':
        if (!task.completed_at) {
          updates.completed_at = metadata?.completedAt || new Date().toISOString();
        }
        if (metadata?.error) {
          updates.error = metadata.error;
        }
        if (metadata?.result !== undefined) {
          updates.result = metadata.result;
        }
        break;
    }
    
    await this.taskStore.updateTask(taskId, updates, sessionId);
    await this.addTaskLog(
      taskId,
      `[STATUS_CHANGE] Task status changed from ${task.status} to ${newStatus}`,
      sessionId
    );
    
    return { ...task, ...updates };
  }
  
  /**
   * Checks if a status transition is valid
   */
  private isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'failed', 'cancelled'],
      completed: [],
      failed: [],
      cancelled: []
    };
    
    return validTransitions[from]?.includes(to) || false;
  }
  
  /**
   * Generates a task report
   */
  async generateTaskReport(
    taskId: string,
    format: 'markdown' | 'json' | 'summary' = 'markdown'
  ): Promise<string> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const logs = await this.taskStore.getLogs(taskId);
    const duration = this.calculateDuration(task);
    
    switch (format) {
      case 'json':
        return JSON.stringify({
          task,
          logs,
          duration,
          metrics: this.calculateTaskMetrics(task, logs)
        }, null, 2);
        
      case 'summary':
        return this.generateSummaryReport(task, logs, duration);
        
      case 'markdown':
      default:
        return this.generateMarkdownReport(task, logs, duration);
    }
  }
  
  /**
   * Generates a markdown report
   */
  private generateMarkdownReport(task: Task, logs: string[], duration: string): string {
    const status = task.status === 'completed' ? '✅' : 
                   task.status === 'failed' ? '❌' :
                   task.status === 'cancelled' ? '⏹️' :
                   task.status === 'in_progress' ? '🔄' : '⏳';
    
    let report = `# Task Report: ${task.title}\n\n`;
    report += `**ID:** ${task.id}\n`;
    report += `**Status:** ${status} ${task.status}\n`;
    report += `**Tool:** ${task.tool === 'CLAUDECODE' ? 'Claude Code' : 'Gemini CLI'}\n`;
    report += `**Branch:** ${task.branch}\n`;
    report += `**Duration:** ${duration}\n`;
    report += `**Created:** ${new Date(task.created_at).toLocaleString()}\n`;
    
    if (task.started_at) {
      report += `**Started:** ${new Date(task.started_at).toLocaleString()}\n`;
    }
    
    if (task.completed_at) {
      report += `**Completed:** ${new Date(task.completed_at).toLocaleString()}\n`;
    }
    
    report += `\n## Description\n\n${task.description}\n`;
    
    if (task.error) {
      report += `\n## Error\n\n\`\`\`\n${task.error}\n\`\`\`\n`;
    }
    
    if (logs.length > 0) {
      report += `\n## Execution Logs (${logs.length} entries)\n\n`;
      report += '```\n';
      report += logs.slice(-50).join('\n');
      report += '\n```\n';
    }
    
    return report;
  }
  
  /**
   * Generates a summary report
   */
  private generateSummaryReport(task: Task, logs: string[], duration: string): string {
    const errorCount = logs.filter(log => log.includes('[ERROR]')).length;
    const warningCount = logs.filter(log => log.includes('[WARNING]')).length;
    
    return [
      `Task: ${task.title}`,
      `Status: ${task.status}`,
      `Duration: ${duration}`,
      `Logs: ${logs.length} entries (${errorCount} errors, ${warningCount} warnings)`,
      task.error ? `Error: ${task.error.substring(0, 100)}...` : ''
    ].filter(Boolean).join('\n');
  }
  
  /**
   * Calculates task duration
   */
  private calculateDuration(task: Task): string {
    if (!task.started_at) {
      return 'Not started';
    }
    
    const start = new Date(task.started_at).getTime();
    const end = task.completed_at 
      ? new Date(task.completed_at).getTime()
      : Date.now();
    
    const seconds = Math.floor((end - start) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  }
  
  /**
   * Calculates task metrics
   */
  private calculateTaskMetrics(task: Task, logs: string[]): Record<string, unknown> {
    return {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.includes('[ERROR]')).length,
      warningCount: logs.filter(log => log.includes('[WARNING]')).length,
      gitOperations: logs.filter(log => log.includes('[GIT')).length,
      agentCommands: logs.filter(log => log.includes('[INSTRUCTIONS')).length,
      elapsedSeconds: 0, // TODO: Calculate from timestamps
      status: task.status
    };
  }
  
  /**
   * Updates a task
   */
  async updateTask(
    taskId: string,
    updates: Partial<Task>,
    sessionId?: string
  ): Promise<Task | null> {
    return this.taskStore.updateTask(taskId, updates, sessionId);
  }
  
  /**
   * Adds a log entry
   */
  async addTaskLog(
    taskId: string,
    log: string,
    sessionId?: string
  ): Promise<void> {
    await this.taskStore.addLog(taskId, log, sessionId);
  }
  
  /**
   * Gets task statistics
   */
  async getTaskStatistics(): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byTool: Record<string, number>;
    averageDuration: number;
    successRate: number;
  }> {
    const tasks = await this.taskStore.getTasks();
    
    const byStatus = tasks.reduce((acc: Record<TaskStatus, number>, task: Task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    const byTool = tasks.reduce((acc: Record<string, number>, task: Task) => {
      acc[task.tool] = (acc[task.tool] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const completedTasks = tasks.filter((t: Task) => t.status === 'completed');
    const totalDuration = completedTasks.reduce((sum: number, task: Task) => {
      if (task.started_at && task.completed_at) {
        const start = new Date(task.started_at).getTime();
        const end = new Date(task.completed_at).getTime();
        return sum + Math.floor((end - start) / 1000);
      }
      return sum;
    }, 0);
    
    const successRate = tasks.length > 0
      ? (completedTasks.length / tasks.length) * 100
      : 0;
    
    return {
      total: tasks.length,
      byStatus,
      byTool,
      averageDuration: completedTasks.length > 0
        ? totalDuration / completedTasks.length
        : 0,
      successRate
    };
  }
}

// Export singleton instance
export const taskOperations = new TaskOperations();