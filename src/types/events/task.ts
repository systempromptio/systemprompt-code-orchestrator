import { Task, TaskStatus, TaskResult, TaskId } from '../core/task';
import { SessionId } from '../core/session';

export type TaskEventMap = {
  'task:created': (data: TaskCreatedEvent) => void;
  'task:updated': (data: TaskUpdatedEvent) => void;
  'task:status:changed': (data: TaskStatusChangedEvent) => void;
  'task:progress': (data: TaskProgressEvent) => void;
  'task:completed': (data: TaskCompletedEvent) => void;
  'task:failed': (data: TaskFailedEvent) => void;
  'task:log': (data: TaskLogEvent) => void;
  'task:deleted': (data: TaskDeletedEvent) => void;
};

export interface TaskCreatedEvent {
  readonly task: Task;
  readonly sessionId: SessionId;
  readonly timestamp: Date;
}

export interface TaskUpdatedEvent {
  readonly taskId: TaskId;
  readonly task: Task;
  readonly changes: Partial<Task>;
  readonly timestamp: Date;
}

export interface TaskStatusChangedEvent {
  readonly taskId: TaskId;
  readonly previousStatus: TaskStatus;
  readonly newStatus: TaskStatus;
  readonly timestamp: Date;
}

export interface TaskProgressEvent {
  readonly taskId: TaskId;
  readonly progress: number;
  readonly message?: string;
  readonly timestamp: Date;
}

export interface TaskCompletedEvent {
  readonly taskId: TaskId;
  readonly result: TaskResult;
  readonly duration: number;
  readonly timestamp: Date;
}

export interface TaskFailedEvent {
  readonly taskId: TaskId;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly timestamp: Date;
}

export interface TaskLogEvent {
  readonly taskId: TaskId;
  readonly log: string;
  readonly level?: 'info' | 'warning' | 'error' | 'debug';
  readonly timestamp: Date;
}

export interface TaskDeletedEvent {
  readonly taskId: TaskId;
  readonly timestamp: Date;
}