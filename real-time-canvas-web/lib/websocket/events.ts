/**
 * WebSocket event types and event bus
 * Provides typed event definitions for WebSocket communication
 */

import type {
  WebSocketMessage,
  WebSocketMessageType,
  ObjectCreatePayload,
  ObjectUpdatePayload,
  ObjectDeletePayload,
  UserPresence,
  CursorPosition,
  CanvasSyncPayload,
  PhysicsPayload,
} from '@/types/websocket'

/**
 * Event bus for WebSocket messages
 */
export class WebSocketEventBus {
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map()

  /**
   * Subscribe to a message type
   */
  on<T = unknown>(
    type: WebSocketMessageType,
    handler: (message: WebSocketMessage<T>) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.add(handler as (message: WebSocketMessage) => void)
    }

    // Return unsubscribe function
    return () => {
      const h = this.listeners.get(type)
      if (h) {
        h.delete(handler as (message: WebSocketMessage) => void)
        if (h.size === 0) {
          this.listeners.delete(type)
        }
      }
    }
  }

  /**
   * Emit a message to all subscribers
   */
  emit<T = unknown>(message: WebSocketMessage<T>): void {
    const handlers = this.listeners.get(message.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message as WebSocketMessage)
        } catch (error) {
          console.error('[WebSocketEventBus] Handler error:', error)
        }
      })
    }

    // Also emit to wildcard listeners
    const wildcard = this.listeners.get('*')
    if (wildcard) {
      wildcard.forEach((handler) => {
        try {
          handler(message as WebSocketMessage)
        } catch (error) {
          console.error('[WebSocketEventBus] Wildcard handler error:', error)
        }
      })
    }
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * Get listener count for a type
   */
  listenerCount(type: WebSocketMessageType): number {
    return this.listeners.get(type)?.size || 0
  }

  /**
   * Get all registered types
   */
  getTypes(): WebSocketMessageType[] {
    return Array.from(this.listeners.keys()) as WebSocketMessageType[]
  }
}

/**
 * Helper to create object create event
 */
export function createObjectCreateEvent(
  roomId: string,
  userId: string,
  payload: ObjectCreatePayload
): WebSocketMessage<ObjectCreatePayload> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'object:create',
    roomId,
    userId,
    timestamp: Date.now(),
    payload,
  }
}

/**
 * Helper to create object update event
 */
export function createObjectUpdateEvent(
  roomId: string,
  userId: string,
  payload: ObjectUpdatePayload
): WebSocketMessage<ObjectUpdatePayload> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'object:update',
    roomId,
    userId,
    timestamp: Date.now(),
    payload,
  }
}

/**
 * Helper to create object delete event
 */
export function createObjectDeleteEvent(
  roomId: string,
  userId: string,
  payload: ObjectDeletePayload
): WebSocketMessage<ObjectDeletePayload> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'object:delete',
    roomId,
    userId,
    timestamp: Date.now(),
    payload,
  }
}

/**
 * Helper to create cursor event
 */
export function createCursorEvent(
  roomId: string,
  userId: string,
  payload: CursorPosition
): WebSocketMessage<CursorPosition> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'user:cursor',
    roomId,
    userId,
    timestamp: Date.now(),
    payload,
  }
}

/**
 * Helper to create physics event
 */
export function createPhysicsEvent(
  roomId: string,
  userId: string,
  payload: PhysicsPayload
): WebSocketMessage<PhysicsPayload> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'physics:throw',
    roomId,
    userId,
    timestamp: Date.now(),
    payload,
  }
}

/**
 * Helper to create canvas sync event
 */
export function createCanvasSyncEvent(
  roomId: string,
  userId: string,
  payload: CanvasSyncPayload
): WebSocketMessage<CanvasSyncPayload> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'canvas:sync',
    roomId,
    userId,
    timestamp: Date.now(),
    payload,
  }
}

/**
 * Global event bus instance
 */
export const eventBus = new WebSocketEventBus()
