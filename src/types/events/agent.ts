import { AgentStatus, AgentError, QueryContext, QueryResult } from '../core/agent';
import { SessionId } from '../core/session';

export type AgentEventMap = {
  'agent:created': (data: AgentCreatedEvent) => void;
  'agent:initialized': (data: AgentInitializedEvent) => void;
  'agent:status:changed': (data: AgentStatusChangedEvent) => void;
  'agent:query:started': (data: AgentQueryStartedEvent) => void;
  'agent:query:completed': (data: AgentQueryCompletedEvent) => void;
  'agent:error': (data: AgentErrorEvent) => void;
  'agent:terminated': (data: AgentTerminatedEvent) => void;
};

export interface AgentCreatedEvent {
  readonly agentId: string;
  readonly provider: string;
  readonly sessionId: SessionId;
  readonly timestamp: Date;
}

export interface AgentInitializedEvent {
  readonly agentId: string;
  readonly provider: string;
  readonly sessionId: SessionId;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface AgentStatusChangedEvent {
  readonly agentId: string;
  readonly sessionId: SessionId;
  readonly previousStatus: AgentStatus;
  readonly newStatus: AgentStatus;
  readonly timestamp: Date;
}

export interface AgentQueryStartedEvent {
  readonly agentId: string;
  readonly sessionId: SessionId;
  readonly queryId: string;
  readonly prompt: string;
  readonly context?: QueryContext;
  readonly timestamp: Date;
}

export interface AgentQueryCompletedEvent {
  readonly agentId: string;
  readonly sessionId: SessionId;
  readonly queryId: string;
  readonly result: QueryResult;
  readonly duration: number;
  readonly timestamp: Date;
}

export interface AgentErrorEvent {
  readonly agentId: string;
  readonly sessionId: SessionId;
  readonly error: AgentError;
  readonly context?: string;
  readonly timestamp: Date;
}

export interface AgentTerminatedEvent {
  readonly agentId: string;
  readonly sessionId: SessionId;
  readonly reason?: string;
  readonly timestamp: Date;
}