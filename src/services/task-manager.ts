/**
 * @file Task Management Service
 * @module services/task-manager
 * 
 * @remarks
 * Modern task management service with full type safety.
 * Manages task lifecycle and state persistence.
 */

import { logger } from '../utils/logger.js';
import {
  Task,
  TaskId,
  ProcessTask,
  ProcessTaskParams,
  TaskFilter,
  createProcessTask
} from '../types/task.js';
import {
  TypedEventEmitterImpl,
  TaskEventMap,
  NotFoundError,
  AppError
} from '../types/index.js';

export interface TaskManagerConfig {
  readonly maxConcurrentTasks: number;
  readonly taskTimeout: number;
  readonly enableMetrics: boolean;
}

/**
 * Task Manager implementation
 */
export class TaskManager extends TypedEventEmitterImpl<TaskEventMap> {
  private static instance: TaskManager;
  private readonly tasks = new Map<TaskId, ProcessTask>();
  private readonly config: TaskManagerConfig;
  
  private constructor(config: Partial<TaskManagerConfig> = {}) {
    super();
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 10,
      taskTimeout: config.taskTimeout ?? 3600000, // 1 hour
      enableMetrics: config.enableMetrics ?? true
    };
  }
  
  static getInstance(config?: Partial<TaskManagerConfig>): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager(config);
    }
    return TaskManager.instance;
  }
  
  /**
   * Create a new process task
   */
  async createTask(params: ProcessTaskParams): Promise<ProcessTask> {
    // Check concurrent task limit
    const runningTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'in_progress').length;
    
    if (runningTasks >= this.config.maxConcurrentTasks) {
      throw new AppError(
        'Maximum concurrent tasks limit reached',
        'TASK_LIMIT_EXCEEDED',
        429,
        { limit: this.config.maxConcurrentTasks, current: runningTasks }
      );
    }
    
    const task = createProcessTask(params);
    this.tasks.set(task.id, task);
    
    // Emit creation event
    this.emit('task:created', {
      task: task as Task,
      sessionId: task.sessionId,
      timestamp: new Date()
    });
    
    logger.info('Task created', { 
      taskId: task.id, 
      type: task.type
    });
    
    return task;
  }
  
  /**
   * Get a task by ID
   */
  async getTask(id: TaskId): Promise<ProcessTask | null> {
    return this.tasks.get(id) || null;
  }
  
  /**
   * Update a task
   */
  async updateTask(
    id: TaskId,
    updates: Partial<ProcessTask>
  ): Promise<ProcessTask> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    
    const updatedTask: ProcessTask = {
      ...task,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.tasks.set(id, updatedTask);
    
    // Emit appropriate events
    if (updates.status && updates.status !== task.status) {
      this.emit('task:status:changed', {
        taskId: id,
        previousStatus: task.status,
        newStatus: updates.status,
        timestamp: new Date()
      });
      
      if (updates.status === 'completed') {
        const duration = task.started_at 
          ? new Date(updatedTask.updated_at).getTime() - new Date(task.started_at).getTime()
          : 0;
          
        this.emit('task:completed', {
          taskId: id,
          result: {
            success: true,
            output: updatedTask.result
          },
          duration,
          timestamp: new Date()
        });
      } else if (updates.status === 'failed') {
        this.emit('task:failed', {
          taskId: id,
          error: {
            code: 'TASK_FAILED',
            message: updatedTask.error || 'Task failed',
            details: updatedTask.result
          },
          timestamp: new Date()
        });
      }
    }
    
    this.emit('task:updated', {
      taskId: id,
      task: updatedTask as Task,
      changes: updates as Partial<Task>,
      timestamp: new Date()
    });
    
    return updatedTask;
  }
  
  /**
   * Delete a task
   */
  async deleteTask(id: TaskId): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    
    this.tasks.delete(id);
    
    this.emit('task:deleted', {
      taskId: id,
      timestamp: new Date()
    });
  }
  
  /**
   * List tasks with optional filtering
   */
  async listTasks(filter?: TaskFilter): Promise<ProcessTask[]> {
    let tasks = Array.from(this.tasks.values());
    
    if (filter) {
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        tasks = tasks.filter(t => statuses.includes(t.status));
      }
      
      if (filter.tool) {
        const tools = Array.isArray(filter.tool) ? filter.tool : [filter.tool];
        tasks = tasks.filter(t => tools.includes(t.tool));
      }
      
      if (filter.assignedTo) {
        tasks = tasks.filter(t => t.assigned_to === filter.assignedTo);
      }
      
      // Branch filtering removed - not part of TaskFilter
      
      if (filter.createdAfter) {
        tasks = tasks.filter(t => t.created_at >= filter.createdAfter!);
      }
      
      if (filter.createdBefore) {
        tasks = tasks.filter(t => t.created_at <= filter.createdBefore!);
      }
      
      if (filter.search) {
        const search = filter.search.toLowerCase();
        tasks = tasks.filter(t => 
          t.description.toLowerCase().includes(search)
        );
      }
    }
    
    // Sort by creation date descending
    return tasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  
  /**
   * Get running tasks count
   */
  getRunningTasksCount(): number {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'in_progress').length;
  }
  
  /**
   * Clean up completed tasks older than specified duration
   */
  async cleanupOldTasks(olderThanMs: number = 86400000): Promise<number> {
    const now = Date.now();
    let removed = 0;
    
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        const taskAge = now - new Date(task.updated_at).getTime();
        if (taskAge > olderThanMs) {
          this.tasks.delete(id);
          removed++;
        }
      }
    }
    
    logger.info('Cleaned up old tasks', { removed, olderThanMs });
    return removed;
  }
}