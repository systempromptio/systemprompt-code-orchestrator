import { EventEmitter } from 'events';

export type EventListenerFn = (...args: any[]) => void;
export type EventMap = Record<string, EventListenerFn>;

export class TypedEventEmitterImpl<_TEventMap extends EventMap = EventMap> extends EventEmitter {
  // Type-safe event emitter implementation
}

export interface EventMetadata {
  readonly timestamp: Date;
  readonly source: string;
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
}

export interface DomainEvent<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly data: T;
  readonly metadata: EventMetadata;
}

export interface EventHandler<T = unknown> {
  handle(event: DomainEvent<T>): Promise<void> | void;
}

export interface EventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void;
}

export function createDomainEvent<T>(
  type: string,
  data: T,
  metadata?: Partial<EventMetadata>
): DomainEvent<T> {
  return {
    id: generateEventId(),
    type,
    data,
    metadata: {
      timestamp: new Date(),
      source: metadata?.source || 'system',
      correlationId: metadata?.correlationId,
      causationId: metadata?.causationId,
      userId: metadata?.userId
    }
  };
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export type TypedEventEmitter<T extends EventMap = EventMap> = TypedEventEmitterImpl<T>;