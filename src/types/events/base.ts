import { EventEmitter } from 'events';

export interface TypedEventEmitter<TEventMap extends Record<string, (...args: any[]) => void>> {
  on<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this;
  off<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this;
  once<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this;
  emit<K extends keyof TEventMap>(event: K, ...args: Parameters<TEventMap[K]>): boolean;
  removeAllListeners<K extends keyof TEventMap>(event?: K): this;
  listenerCount<K extends keyof TEventMap>(event: K): number;
  listeners<K extends keyof TEventMap>(event: K): TEventMap[K][];
  prependListener<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this;
  prependOnceListener<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this;
}

export class TypedEventEmitterImpl<TEventMap extends Record<string, (...args: any[]) => void>> 
  extends EventEmitter 
  implements TypedEventEmitter<TEventMap> {
  
  on<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this {
    return super.on(event as string | symbol, listener as any);
  }

  off<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this {
    return super.off(event as string | symbol, listener as any);
  }

  once<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this {
    return super.once(event as string | symbol, listener as any);
  }

  emit<K extends keyof TEventMap>(event: K, ...args: Parameters<TEventMap[K]>): boolean {
    return super.emit(event as string | symbol, ...args);
  }

  removeAllListeners<K extends keyof TEventMap>(event?: K): this {
    return super.removeAllListeners(event as string | symbol | undefined);
  }

  listenerCount<K extends keyof TEventMap>(event: K): number {
    return super.listenerCount(event as string | symbol);
  }

  listeners<K extends keyof TEventMap>(event: K): TEventMap[K][] {
    return super.listeners(event as string | symbol) as TEventMap[K][];
  }

  prependListener<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this {
    return super.prependListener(event as string | symbol, listener as any);
  }

  prependOnceListener<K extends keyof TEventMap>(event: K, listener: TEventMap[K]): this {
    return super.prependOnceListener(event as string | symbol, listener as any);
  }
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