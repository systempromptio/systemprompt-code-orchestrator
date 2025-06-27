import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Task } from './task-store.js';

export interface PersistenceConfig {
  type: 'filesystem' | 'redis' | 'postgres';
  basePath?: string;
  redisUrl?: string;
  databaseUrl?: string;
}

export interface PersistedState {
  tasks: Task[];
  sessions: Array<{
    id: string;
    type: string;
    status: string;
    created_at: string;
    task_id?: string;
  }>;
  metrics: {
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    average_completion_time: number;
  };
  last_saved: string;
}

export class StatePersistence extends EventEmitter {
  private static instance: StatePersistence;
  private config: PersistenceConfig;
  private saveInterval: NodeJS.Timeout | null = null;
  private statePath: string;
  
  private constructor(config?: PersistenceConfig) {
    super();
    this.config = config || {
      type: 'filesystem',
      basePath: process.env.STATE_PATH || './coding-agent-state'
    };
    
    // Use the configured base path directly
    this.statePath = this.config.basePath || process.env.STATE_PATH || './coding-agent-state';
    this.initializeStorage();
  }
  
  static getInstance(config?: PersistenceConfig): StatePersistence {
    if (!StatePersistence.instance) {
      StatePersistence.instance = new StatePersistence(config);
    }
    return StatePersistence.instance;
  }
  
  private async initializeStorage(): Promise<void> {
    if (this.config.type === 'filesystem') {
      try {
        await fs.mkdir(this.statePath, { recursive: true });
        
        // Create subdirectories
        await fs.mkdir(path.join(this.statePath, 'tasks'), { recursive: true });
        await fs.mkdir(path.join(this.statePath, 'sessions'), { recursive: true });
        await fs.mkdir(path.join(this.statePath, 'logs'), { recursive: true });
        await fs.mkdir(path.join(this.statePath, 'reports'), { recursive: true });
        
        console.log(`State persistence initialized at: ${this.statePath}`);
      } catch (error) {
        console.error('Failed to initialize state storage:', error);
      }
    }
    
    // Start auto-save interval (every 30 seconds)
    this.saveInterval = setInterval(() => {
      this.autoSave().catch(console.error);
    }, 30000);
  }
  
  async saveState(state: PersistedState): Promise<void> {
    if (this.config.type === 'filesystem') {
      const stateFile = path.join(this.statePath, 'state.json');
      const backupFile = path.join(this.statePath, `state.backup.${Date.now()}.json`);
      
      try {
        // Create backup of existing state
        try {
          const existing = await fs.readFile(stateFile, 'utf-8');
          await fs.writeFile(backupFile, existing);
          
          // Keep only last 10 backups
          await this.cleanupBackups();
        } catch (error) {
          // No existing state file
        }
        
        // Save new state
        await fs.writeFile(
          stateFile,
          JSON.stringify(state, null, 2),
          'utf-8'
        );
        
        this.emit('state:saved', { timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Failed to save state:', error);
        this.emit('state:save-error', error);
      }
    }
    // TODO: Implement Redis and PostgreSQL persistence
  }
  
  async loadState(): Promise<PersistedState | null> {
    if (this.config.type === 'filesystem') {
      const stateFile = path.join(this.statePath, 'state.json');
      
      try {
        const data = await fs.readFile(stateFile, 'utf-8');
        const state = JSON.parse(data) as PersistedState;
        
        this.emit('state:loaded', { timestamp: new Date().toISOString() });
        return state;
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          console.error('Failed to load state:', error);
        }
        return null;
      }
    }
    // TODO: Implement Redis and PostgreSQL loading
    return null;
  }
  
  async saveTask(task: Task): Promise<void> {
    if (this.config.type === 'filesystem') {
      const taskFile = path.join(this.statePath, 'tasks', `${task.id}.json`);
      
      try {
        await fs.writeFile(
          taskFile,
          JSON.stringify(task, null, 2),
          'utf-8'
        );
      } catch (error) {
        console.error(`Failed to save task ${task.id}:`, error);
      }
    }
  }
  
  async loadTasks(): Promise<Task[]> {
    if (this.config.type === 'filesystem') {
      const tasksDir = path.join(this.statePath, 'tasks');
      
      try {
        const files = await fs.readdir(tasksDir);
        const tasks: Task[] = [];
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const data = await fs.readFile(
                path.join(tasksDir, file),
                'utf-8'
              );
              tasks.push(JSON.parse(data));
            } catch (error) {
              console.error(`Failed to load task ${file}:`, error);
            }
          }
        }
        
        return tasks;
      } catch (error) {
        console.error('Failed to load tasks:', error);
        return [];
      }
    }
    return [];
  }
  
  async saveSessionLog(sessionId: string, log: string): Promise<void> {
    if (this.config.type === 'filesystem') {
      const logFile = path.join(
        this.statePath,
        'logs',
        `session_${sessionId}_${Date.now()}.log`
      );
      
      try {
        await fs.appendFile(logFile, log + '\n', 'utf-8');
      } catch (error) {
        console.error(`Failed to save session log:`, error);
      }
    }
  }
  
  async saveReport(reportId: string, report: any): Promise<string> {
    if (this.config.type === 'filesystem') {
      const reportFile = path.join(
        this.statePath,
        'reports',
        `report_${reportId}_${Date.now()}.json`
      );
      
      try {
        await fs.writeFile(
          reportFile,
          JSON.stringify(report, null, 2),
          'utf-8'
        );
        return reportFile;
      } catch (error) {
        console.error(`Failed to save report:`, error);
        throw error;
      }
    }
    return '';
  }
  
  private async cleanupBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.statePath);
      const backups = files
        .filter(f => f.startsWith('state.backup.'))
        .sort()
        .reverse();
      
      // Keep only last 10 backups
      for (let i = 10; i < backups.length; i++) {
        await fs.unlink(path.join(this.statePath, backups[i]));
      }
    } catch (error) {
      console.error('Failed to cleanup backups:', error);
    }
  }
  
  private async autoSave(): Promise<void> {
    // This will be called by TaskStore and AgentManager
    this.emit('autosave:triggered');
  }
  
  async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Final save before shutdown
    this.emit('shutdown:save');
  }
}