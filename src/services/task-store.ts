import { EventEmitter } from 'events';
import { StatePersistence } from './state-persistence.js';

export interface Task {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  priority: "low" | "medium" | "high" | "critical";
  estimated_complexity: "simple" | "moderate" | "complex" | "very_complex";
  preferred_agent: "claude" | "gemini" | "auto";
  project_path: string;
  branch: string;
  dependencies: string[];
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  progress: number;
  logs: string[];
  result?: any;
  error?: any;
}

export class TaskStore extends EventEmitter {
  private static instance: TaskStore;
  private tasks: Map<string, Task> = new Map();
  private persistence: StatePersistence;
  
  private constructor() {
    super();
    this.persistence = StatePersistence.getInstance();
    this.loadPersistedTasks();
    
    // Set up auto-save on state changes
    this.on('task:created', () => this.persistState());
    this.on('task:updated', () => this.persistState());
  }
  
  static getInstance(): TaskStore {
    if (!TaskStore.instance) {
      TaskStore.instance = new TaskStore();
    }
    return TaskStore.instance;
  }
  
  private async loadPersistedTasks(): Promise<void> {
    try {
      const tasks = await this.persistence.loadTasks();
      for (const task of tasks) {
        this.tasks.set(task.id, task);
      }
      console.log(`Loaded ${tasks.length} persisted tasks`);
    } catch (error) {
      console.error('Failed to load persisted tasks:', error);
    }
  }
  
  private async persistState(): Promise<void> {
    try {
      const state = await this.getState();
      await this.persistence.saveState(state);
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
  
  async getState(): Promise<any> {
    const tasks = Array.from(this.tasks.values());
    const metrics = {
      total_tasks: tasks.length,
      completed_tasks: tasks.filter(t => t.status === 'completed').length,
      failed_tasks: tasks.filter(t => t.status === 'failed').length,
      average_completion_time: this.calculateAverageCompletionTime()
    };
    
    return {
      tasks,
      sessions: [], // Will be populated by AgentManager
      metrics,
      last_saved: new Date().toISOString()
    };
  }
  
  private calculateAverageCompletionTime(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed');
    
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, task) => {
      const duration = new Date(task.updated_at).getTime() - 
                      new Date(task.created_at).getTime();
      return sum + duration;
    }, 0);
    
    return Math.round(totalTime / completedTasks.length);
  }
  
  async createTask(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
    await this.persistence.saveTask(task);
    this.emit('task:created', task);
  }
  
  async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }
  
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    const updatedTask = {
      ...task,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.tasks.set(taskId, updatedTask);
    await this.persistence.saveTask(updatedTask);
    this.emit('task:updated', updatedTask);
    
    return updatedTask;
  }
  
  async getTasks(filter?: {
    status?: Task['status'];
    priority?: Task['priority'];
    assigned_to?: string;
  }): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());
    
    if (filter) {
      if (filter.status) {
        tasks = tasks.filter(t => t.status === filter.status);
      }
      if (filter.priority) {
        tasks = tasks.filter(t => t.priority === filter.priority);
      }
      if (filter.assigned_to !== undefined) {
        tasks = tasks.filter(t => t.assigned_to === filter.assigned_to);
      }
    }
    
    return tasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  
  async addLog(taskId: string, log: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.logs.push(`[${new Date().toISOString()}] ${log}`);
      task.updated_at = new Date().toISOString();
      await this.persistence.saveTask(task);
      this.emit('task:log', { taskId, log });
    }
  }
  
  async updateProgress(taskId: string, progress: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.progress = Math.min(100, Math.max(0, progress));
      task.updated_at = new Date().toISOString();
      await this.persistence.saveTask(task);
      this.emit('task:progress', { taskId, progress: task.progress });
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.delete(taskId);
      await this.persistState();
      this.emit('task:deleted', { taskId });
    }
  }
}