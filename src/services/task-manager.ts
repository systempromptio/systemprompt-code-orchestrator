/**
 * @file Task Management Service
 * @module services/task-manager
 * 
 * @remarks
 * Modern task management service with full type safety and event-driven architecture.
 * Manages task lifecycle, process execution, and state persistence.
 */

import { v4 as uuidv4 } from 'uuid';
import { ChildProcess, spawn } from 'child_process';
import { logger } from '../utils/logger.js';
import {
  Task,
  TaskId,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskResult,
  TaskFilter,
  TaskUpdate,
  TaskManager as ITaskManager,
  TaskTreeNode,
  createTaskId,
  TypedEventEmitterImpl,
  TaskEventMap,
  NotFoundError,
  AppError,
  ValidationError,
  TaskSchema,
  TaskMetrics,
  TaskError as ITaskError
} from '../types/index.js';

/**
 * Extended task interface for process management
 */
export interface ProcessTask extends Omit<Task, 'completedAt'> {
  command?: string;
  args?: string[];
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  output: string[];
  errorOutput: string[];
  exitCode?: number;
  processId?: number;
  signal?: NodeJS.Signals | null;
  completedAt?: Date;
}

/**
 * Internal task process tracking
 */
interface TaskProcess {
  task: ProcessTask;
  process?: ChildProcess;
  outputBuffer: string[];
  errorBuffer: string[];
  startTime?: number;
  abortController?: AbortController;
}

/**
 * Task manager configuration
 */
export interface TaskManagerConfig {
  maxConcurrentTasks?: number;
  defaultTimeout?: number;
  autoCleanupInterval?: number;
  persistTasks?: boolean;
  maxOutputBufferSize?: number;
}

/**
 * Modern, type-safe task management service
 */
export class TaskManager extends TypedEventEmitterImpl<TaskEventMap> implements ITaskManager {
  private static instance: TaskManager;
  private readonly tasks = new Map<TaskId, TaskProcess>();
  private readonly config: Required<TaskManagerConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  
  private constructor(config: TaskManagerConfig = {}) {
    super();
    
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      defaultTimeout: config.defaultTimeout ?? 300000, // 5 minutes
      autoCleanupInterval: config.autoCleanupInterval ?? 60000, // 1 minute
      persistTasks: config.persistTasks ?? true,
      maxOutputBufferSize: config.maxOutputBufferSize ?? 10000
    };
    
    this.startAutoCleanup();
  }
  
  static getInstance(config?: TaskManagerConfig): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager(config);
    }
    return TaskManager.instance;
  }
  
  /**
   * Create a new task with full validation
   */
  async createTask(params: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    // Validate input
    const validation = TaskSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    }).safeParse(params);
    
    if (!validation.success) {
      throw new ValidationError(
        validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          value: undefined, // Zod doesn't provide input on all error types
          constraint: e.code
        }))
      );
    }
    
    // Check concurrent task limit
    const runningTasks = Array.from(this.tasks.values())
      .filter(tp => tp.task.status === 'in_progress').length;
    
    if (runningTasks >= this.config.maxConcurrentTasks) {
      throw new AppError(
        'Maximum concurrent tasks limit reached',
        'TASK_LIMIT_EXCEEDED',
        429,
        { limit: this.config.maxConcurrentTasks, current: runningTasks }
      );
    }
    
    const taskId = createTaskId(uuidv4());
    const now = new Date();
    
    const task: ProcessTask = {
      id: taskId,
      sessionId: params.sessionId,
      type: params.type,
      status: params.status,
      priority: params.priority,
      title: params.title,
      description: params.description,
      createdAt: now,
      updatedAt: now,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      assignedTo: params.assignedTo,
      parentTaskId: params.parentTaskId,
      subtasks: params.subtasks,
      dependencies: params.dependencies,
      result: params.result,
      metadata: params.metadata,
      output: [],
      errorOutput: []
    };
    
    const taskProcess: TaskProcess = {
      task,
      outputBuffer: [],
      errorBuffer: []
    };
    
    this.tasks.set(taskId, taskProcess);
    
    // Emit creation event
    this.emit('task:created', {
      task,
      sessionId: task.sessionId,
      timestamp: now
    });
    
    logger.info('Task created', { 
      taskId, 
      type: task.type, 
      priority: task.priority 
    });
    
    return task;
  }
  
  /**
   * Get a task by ID
   */
  async getTask(id: TaskId): Promise<Task | null> {
    const taskProcess = this.tasks.get(id);
    return taskProcess ? { ...taskProcess.task } : null;
  }
  
  /**
   * Update task with validation
   */
  async updateTask(id: TaskId, updates: TaskUpdate): Promise<Task> {
    const taskProcess = this.tasks.get(id);
    if (!taskProcess) {
      throw new NotFoundError('Task', id);
    }
    
    const previousStatus = taskProcess.task.status;
    const now = new Date();
    
    // Apply updates
    Object.assign(taskProcess.task, updates, { updatedAt: now });
    
    // Emit update event
    this.emit('task:updated', {
      taskId: id,
      task: { ...taskProcess.task },
      changes: updates,
      timestamp: now
    });
    
    // Emit status change event if status changed
    if (updates.status && updates.status !== previousStatus) {
      this.emit('task:status:changed', {
        taskId: id,
        previousStatus,
        newStatus: updates.status,
        timestamp: now
      });
      
      // Handle completion/failure events
      if (updates.status === 'completed') {
        this.emit('task:completed', {
          taskId: id,
          result: taskProcess.task.result!,
          duration: taskProcess.startTime ? Date.now() - taskProcess.startTime : 0,
          timestamp: now
        });
      } else if (updates.status === 'failed') {
        this.emit('task:failed', {
          taskId: id,
          error: taskProcess.task.result?.error || {
            code: 'UNKNOWN_ERROR',
            message: 'Task failed without error details'
          },
          timestamp: now
        });
      }
    }
    
    return { ...taskProcess.task };
  }
  
  /**
   * Delete a task
   */
  async deleteTask(id: TaskId): Promise<void> {
    const taskProcess = this.tasks.get(id);
    if (!taskProcess) {
      throw new NotFoundError('Task', id);
    }
    
    // Cancel if running
    if (taskProcess.process && taskProcess.task.status === 'in_progress') {
      await this.cancelTask(id);
    }
    
    this.tasks.delete(id);
    
    this.emit('task:deleted', {
      taskId: id,
      timestamp: new Date()
    });
    
    logger.info('Task deleted', { taskId: id });
  }
  
  /**
   * List tasks with filtering
   */
  async listTasks(filter?: TaskFilter): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values()).map(tp => ({ ...tp.task }));
    
    if (filter) {
      // Apply filters
      if (filter.sessionId) {
        tasks = tasks.filter(t => t.sessionId === filter.sessionId);
      }
      
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        tasks = tasks.filter(t => statuses.includes(t.status));
      }
      
      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        tasks = tasks.filter(t => priorities.includes(t.priority));
      }
      
      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type];
        tasks = tasks.filter(t => types.includes(t.type));
      }
      
      if (filter.assignedTo) {
        tasks = tasks.filter(t => t.assignedTo === filter.assignedTo);
      }
      
      if (filter.parentTaskId) {
        tasks = tasks.filter(t => t.parentTaskId === filter.parentTaskId);
      }
      
      if (filter.createdAfter) {
        tasks = tasks.filter(t => t.createdAt >= filter.createdAfter!);
      }
      
      if (filter.createdBefore) {
        tasks = tasks.filter(t => t.createdAt <= filter.createdBefore!);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        tasks = tasks.filter(t => 
          t.metadata.tags?.some(tag => filter.tags!.includes(tag))
        );
      }
    }
    
    // Sort by creation date (newest first)
    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * Get task tree (hierarchical view)
   */
  async getTaskTree(rootId: TaskId): Promise<TaskTreeNode> {
    const rootTask = await this.getTask(rootId);
    if (!rootTask) {
      throw new NotFoundError('Task', rootId);
    }
    
    return this.buildTaskTree(rootTask);
  }
  
  /**
   * Start task execution
   */
  async startTask(taskId: TaskId): Promise<Task> {
    const taskProcess = this.tasks.get(taskId);
    if (!taskProcess) {
      throw new NotFoundError('Task', taskId);
    }
    
    const { task } = taskProcess;
    
    if (task.status !== 'pending') {
      throw new AppError(
        'Task must be in pending state to start',
        'INVALID_TASK_STATE',
        400,
        { taskId, currentStatus: task.status }
      );
    }
    
    if (!task.command) {
      throw new AppError(
        'Task has no command to execute',
        'NO_COMMAND',
        400,
        { taskId }
      );
    }
    
    // Update task state
    taskProcess.startTime = Date.now();
    await this.updateTask(taskId, { 
      status: 'in_progress',
      startedAt: new Date()
    });
    
    // Create abort controller for timeout
    taskProcess.abortController = new AbortController();
    
    try {
      // Spawn process
      const childProcess = spawn(task.command, task.args || [], {
        cwd: task.workingDirectory,
        env: { ...process.env, ...task.environmentVariables },
        signal: taskProcess.abortController.signal
      });
      
      taskProcess.process = childProcess;
      task.processId = childProcess.pid;
      
      // Handle stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        taskProcess.outputBuffer.push(output);
        task.output.push(output);
        
        // Emit progress event
        this.emit('task:progress', {
          taskId,
          progress: 0, // Could calculate based on expected output
          message: output.trim(),
          timestamp: new Date()
        });
        
        // Manage buffer size
        if (taskProcess.outputBuffer.length > this.config.maxOutputBufferSize) {
          taskProcess.outputBuffer.shift();
        }
      });
      
      // Handle stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        const error = data.toString();
        taskProcess.errorBuffer.push(error);
        task.errorOutput.push(error);
        
        // Log task output
        this.emit('task:log', {
          taskId,
          log: error.trim(),
          level: 'error',
          timestamp: new Date()
        });
        
        // Manage buffer size
        if (taskProcess.errorBuffer.length > this.config.maxOutputBufferSize) {
          taskProcess.errorBuffer.shift();
        }
      });
      
      // Handle process completion
      childProcess.on('close', async (code, signal) => {
        task.exitCode = code ?? undefined;
        task.signal = signal;
        task.completedAt = new Date();
        
        const duration = taskProcess.startTime 
          ? Date.now() - taskProcess.startTime 
          : 0;
        
        const metrics: TaskMetrics = {
          duration,
          tokensUsed: 0, // Would need to track if using AI
          retries: 0,
          cpuTime: process.cpuUsage().user / 1000,
          memoryUsed: process.memoryUsage().heapUsed
        };
        
        const taskError: ITaskError | undefined = code !== 0 ? {
          code: 'PROCESS_EXITED',
          message: `Process exited with code ${code}`,
          details: { code, signal, stderr: taskProcess.errorBuffer.join('') },
          recoverable: false
        } : undefined;
        
        const result: TaskResult = {
          success: code === 0,
          output: taskProcess.outputBuffer.join(''),
          error: taskError,
          metrics
        };
        
        await this.updateTask(taskId, {
          status: code === 0 ? 'completed' : 'failed',
          result,
          completedAt: task.completedAt
        });
        
        // Cleanup
        delete taskProcess.process;
        delete taskProcess.abortController;
      });
      
      // Handle process error
      childProcess.on('error', async (error) => {
        const taskError: ITaskError = {
          code: 'PROCESS_ERROR',
          message: error.message,
          details: error,
          recoverable: false
        };
        
        const result: TaskResult = {
          success: false,
          error: taskError
        };
        
        await this.updateTask(taskId, {
          status: 'failed',
          result,
          completedAt: new Date()
        });
        
        // Cleanup
        delete taskProcess.process;
        delete taskProcess.abortController;
      });
      
      // Set timeout
      const timeout = (task.metadata.timeout as number | undefined) || this.config.defaultTimeout;
      setTimeout(() => {
        if (taskProcess.process && task.status === 'in_progress') {
          this.cancelTask(taskId);
        }
      }, timeout);
      
      return { ...task };
      
    } catch (error) {
      const taskError: ITaskError = {
        code: 'START_FAILED',
        message: error instanceof Error ? error.message : 'Failed to start task',
        details: error,
        recoverable: false
      };
      
      const result: TaskResult = {
        success: false,
        error: taskError
      };
      
      await this.updateTask(taskId, {
        status: 'failed',
        result,
        completedAt: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Cancel a running task
   */
  async cancelTask(taskId: TaskId): Promise<Task> {
    const taskProcess = this.tasks.get(taskId);
    if (!taskProcess) {
      throw new NotFoundError('Task', taskId);
    }
    
    if (taskProcess.task.status !== 'in_progress') {
      throw new AppError(
        'Only running tasks can be cancelled',
        'INVALID_TASK_STATE',
        400,
        { taskId, currentStatus: taskProcess.task.status }
      );
    }
    
    // Kill the process if running
    if (taskProcess.process) {
      taskProcess.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (taskProcess.process && !taskProcess.process.killed) {
          taskProcess.process.kill('SIGKILL');
        }
      }, 5000);
    }
    
    // Abort any pending operations
    taskProcess.abortController?.abort();
    
    const taskError: ITaskError = {
      code: 'CANCELLED',
      message: 'Task was cancelled by user',
      details: { cancelledAt: new Date() },
      recoverable: true
    };
    
    const result: TaskResult = {
      success: false,
      error: taskError
    };
    
    await this.updateTask(taskId, {
      status: 'cancelled',
      result,
      completedAt: new Date()
    });
    
    return taskProcess.task;
  }
  
  /**
   * Add log entry to task
   */
  async addTaskLog(taskId: TaskId, log: string, level: 'info' | 'warning' | 'error' | 'debug' = 'info'): Promise<void> {
    const taskProcess = this.tasks.get(taskId);
    if (!taskProcess) {
      throw new NotFoundError('Task', taskId);
    }
    
    this.emit('task:log', {
      taskId,
      log,
      level,
      timestamp: new Date()
    });
  }
  
  /**
   * Update task progress
   */
  async updateTaskProgress(taskId: TaskId, progress: number, message?: string): Promise<void> {
    const taskProcess = this.tasks.get(taskId);
    if (!taskProcess) {
      throw new NotFoundError('Task', taskId);
    }
    
    this.emit('task:progress', {
      taskId,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      timestamp: new Date()
    });
  }
  
  /**
   * Get task statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byType: Record<TaskType, number>;
    byPriority: Record<TaskPriority, number>;
    averageCompletionTime: number;
  } {
    const tasks = Array.from(this.tasks.values()).map(tp => tp.task);
    
    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    const byType = tasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {} as Record<TaskType, number>);
    
    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskPriority, number>);
    
    const completedTasks = tasks.filter(t => 
      t.status === 'completed' && t.result?.metrics?.duration
    );
    
    const averageCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.result?.metrics?.duration || 0), 0) / completedTasks.length
      : 0;
    
    return {
      total: tasks.length,
      byStatus,
      byType,
      byPriority,
      averageCompletionTime
    };
  }
  
  /**
   * Build task tree recursively
   */
  private buildTaskTree(task: Task): TaskTreeNode {
    const children = Array.from(this.tasks.values())
      .filter(tp => tp.task.parentTaskId === task.id)
      .map(tp => this.buildTaskTree(tp.task));
    
    return { task, children };
  }
  
  /**
   * Start automatic cleanup of completed tasks
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const tasksToClean: TaskId[] = [];
      
      for (const [taskId, taskProcess] of this.tasks.entries()) {
        const task = taskProcess.task;
        
        // Clean up completed tasks older than 1 hour
        if (['completed', 'failed', 'cancelled'].includes(task.status)) {
          const age = now - task.completedAt!.getTime();
          if (age > 3600000) { // 1 hour
            tasksToClean.push(taskId);
          }
        }
      }
      
      // Delete old tasks
      for (const taskId of tasksToClean) {
        this.tasks.delete(taskId);
        logger.debug('Auto-cleaned old task', { taskId });
      }
    }, this.config.autoCleanupInterval);
  }
  
  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Cancel all running tasks
    const runningTasks = Array.from(this.tasks.entries())
      .filter(([_, tp]) => tp.task.status === 'in_progress');
    
    for (const [taskId] of runningTasks) {
      await this.cancelTask(taskId);
    }
    
    logger.info('Task manager shutdown complete');
  }
}

// Export singleton instance
export const taskManager = TaskManager.getInstance();