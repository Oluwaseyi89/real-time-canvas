/**
 * WebSocket client for real-time communication
 * Handles connection, reconnection, message queuing, and event dispatching
 */

import type {
  ConnectionState,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketHandlers,
  UserPresence,
  CursorPosition,
  ObjectCreatePayload,
  ObjectUpdatePayload,
  ObjectDeletePayload,
  CanvasSyncPayload,
  PhysicsPayload,
  PhysicsEnabledPayload,
  PhysicsGravityPayload,
  ErrorPayload,
} from '@/types/websocket'
import { v4 as uuidv4 } from 'uuid'

/**
 * WebSocket client configuration
 */
interface WebSocketConfig {
  url: string
  roomId: string
  userId: string
  username: string
  /**
   * Signed JWT proving identity. The server derives userId/username from
   * this (browsers can't set an Authorization header on a WS upgrade
   * request, so it travels as a query param) — the userId/username fields
   * above are no longer trusted server-side, only used for local UI state
   * before the connection is even open.
   */
  token: string
  reconnectAttempts?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

/**
 * Type guard to check if payload is UserPresence
 */
function isUserPresence(payload: unknown): payload is UserPresence {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'username' in payload
  )
}

/**
 * Type guard to check if payload is CursorPosition
 */
function isCursorPosition(payload: unknown): payload is CursorPosition {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'x' in payload &&
    'y' in payload
  )
}

/**
 * Type guard to check if payload is ObjectCreatePayload
 */
function isObjectCreatePayload(payload: unknown): payload is ObjectCreatePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'objectId' in payload &&
    'type' in payload
  )
}

/**
 * Type guard to check if payload is ObjectUpdatePayload
 */
function isObjectUpdatePayload(payload: unknown): payload is ObjectUpdatePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'objectId' in payload &&
    'updates' in payload
  )
}

/**
 * Type guard to check if payload is ObjectDeletePayload
 */
function isObjectDeletePayload(payload: unknown): payload is ObjectDeletePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'objectId' in payload
  )
}

/**
 * Type guard to check if payload is CanvasSyncPayload
 */
function isCanvasSyncPayload(payload: unknown): payload is CanvasSyncPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'objects' in payload &&
    'version' in payload
  )
}

/**
 * Type guard to check if payload is PhysicsPayload
 */
function isPhysicsPayload(payload: unknown): payload is PhysicsPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'objectId' in payload &&
    'type' in payload
  )
}

/**
 * Type guard to check if payload is PhysicsEnabledPayload
 */
function isPhysicsEnabledPayload(payload: unknown): payload is PhysicsEnabledPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'enabled' in payload
  )
}

/**
 * Type guard to check if payload is PhysicsGravityPayload
 */
function isPhysicsGravityPayload(payload: unknown): payload is PhysicsGravityPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'gravity' in payload
  )
}

/**
 * Type guard for room joined payload
 */
function isRoomJoinedPayload(payload: unknown): payload is { roomId: string; users: UserPresence[] } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'roomId' in payload &&
    'users' in payload &&
    Array.isArray((payload as any).users)
  )
}

/**
 * Type guard for user joined payload
 */
function isUserJoinedPayload(payload: unknown): payload is { userId: string; username: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'username' in payload
  )
}

/**
 * Type guard for user left payload
 */
function isUserLeftPayload(payload: unknown): payload is { userId: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload
  )
}

/**
 * WebSocket client class with full type safety
 */
export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private state: ConnectionState = 'disconnected'
  private handlers: WebSocketHandlers = {}
  private messageQueue: WebSocketMessage[] = []
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnecting = false
  private isAuthenticated = false

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 0,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true
    this.setState('connecting')

    try {
      const wsUrl = new URL(this.config.url)
      wsUrl.searchParams.set('roomId', this.config.roomId)
      wsUrl.searchParams.set('userId', this.config.userId)
      wsUrl.searchParams.set('username', this.config.username)
      wsUrl.searchParams.set('token', this.config.token)

      this.ws = new WebSocket(wsUrl.toString())
      this.setupEventListeners()
    } catch (error) {
      console.error('[WebSocketClient] Connection error:', error)
      this.handleError({ code: 'CONNECTION_ERROR', message: 'Failed to connect to server' })
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.cleanup()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected')
      this.ws = null
    }
    this.setState('disconnected')
    this.isConnecting = false
    this.isAuthenticated = false
  }

  /**
   * Send a message to the server
   */
  send<T = unknown>(
    type: WebSocketMessageType,
    payload: T,
    options: { priority?: boolean } = {}
  ): string {
    const message: WebSocketMessage<T> = {
      id: uuidv4(),
      type,
      roomId: this.config.roomId,
      userId: this.config.userId,
      timestamp: Date.now(),
      payload,
    }

    if (this.isConnected()) {
      this.sendMessage(message)
    } else if (options.priority) {
      this.sendMessage(message) // Try to send anyway
    } else {
      this.messageQueue.push(message as WebSocketMessage)
    }

    return message.id
  }

  /**
   * Register event handlers
   */
  on(handlers: WebSocketHandlers): void {
    this.handlers = { ...this.handlers, ...handlers }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get reconnect attempts
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.handleOpen()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event)
    }

    this.ws.onclose = (event: CloseEvent) => {
      this.handleClose(event)
    }

    this.ws.onerror = (event: Event) => {
      this.handleError({
        code: 'WEBSOCKET_ERROR',
        message: 'WebSocket error occurred',
        details: { event },
      })
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.isConnecting = false
    this.reconnectAttempts = 0
    this.setState('connected')
    this.isAuthenticated = true
    this.startHeartbeat()

    // Send queued messages
    this.flushQueue()

    // Trigger connect handler
    this.handlers.onConnect?.()
    console.log('[WebSocketClient] Connected to server')
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage

      // Handle heartbeat response
      if (data.type === 'connection:ack') {
        return
      }

      // Dispatch to handlers
      this.dispatchMessage(data)

      // Trigger generic message handler
      this.handlers.onMessage?.(data)
    } catch (error) {
      console.error('[WebSocketClient] Failed to parse message:', error)
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat()
    this.isConnecting = false
    this.isAuthenticated = false

    if (event.wasClean) {
      this.setState('disconnected')
      this.handlers.onDisconnect?.()
      console.log('[WebSocketClient] Disconnected cleanly')
    } else {
      this.setState('error')
      this.handleError({
        code: 'CONNECTION_LOST',
        message: 'Connection lost unexpectedly',
        details: { code: event.code, reason: event.reason },
      })
      this.scheduleReconnect()
    }
  }

  /**
   * Handle error events
   */
  private handleError(error: ErrorPayload): void {
    console.error('[WebSocketClient] Error:', error)
    this.handlers.onError?.(error)
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      console.error('[WebSocketClient] Max reconnect attempts reached')
      this.setState('disconnected')
      return
    }

    const delay = this.config.reconnectDelay || 1000
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.setState('reconnecting')
      this.handlers.onReconnect?.(this.reconnectAttempts)
      console.log(`[WebSocketClient] Reconnecting... (attempt ${this.reconnectAttempts})`)
      this.connect()
    }, delay * Math.pow(1.5, this.reconnectAttempts - 1))
  }

  /**
   * Send a message immediately
   */
  private sendMessage<T>(message: WebSocketMessage<T>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('[WebSocketClient] Failed to send message:', error)
        if (!this.messageQueue.includes(message as unknown as WebSocketMessage)) {
          this.messageQueue.push(message as unknown as WebSocketMessage)
        }
      }
    } else {
      this.messageQueue.push(message as unknown as WebSocketMessage)
    }
  }

  /**
   * Flush queued messages
   */
  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.sendMessage(message)
      }
    }
  }

  /**
   * Dispatch message to appropriate handler with type guards
   */
  private dispatchMessage(message: WebSocketMessage): void {
    const { type, payload } = message

    switch (type) {
      case 'room:joined':
        if (isRoomJoinedPayload(payload)) {
          this.handlers.onRoomJoined?.(payload.roomId, payload.users)
        }
        break
      case 'user:presence':
        if (isUserPresence(payload)) {
          this.handlers.onUserPresence?.(payload)
        }
        break
      case 'user:cursor':
        if (isCursorPosition(payload)) {
          this.handlers.onCursorMove?.(payload)
        }
        break
      case 'user:joined':
        if (isUserJoinedPayload(payload)) {
          this.handlers.onUserJoined?.(payload)
        }
        break
      case 'user:left':
        if (isUserLeftPayload(payload)) {
          this.handlers.onUserLeft?.(payload)
        }
        break
      case 'object:create':
        if (isObjectCreatePayload(payload)) {
          this.handlers.onObjectCreate?.(message as WebSocketMessage<ObjectCreatePayload>)
        }
        break
      case 'object:update':
        if (isObjectUpdatePayload(payload)) {
          this.handlers.onObjectUpdate?.(message as WebSocketMessage<ObjectUpdatePayload>)
        }
        break
      case 'object:delete':
        if (isObjectDeletePayload(payload)) {
          this.handlers.onObjectDelete?.(message as WebSocketMessage<ObjectDeletePayload>)
        }
        break
      case 'canvas:sync':
        if (isCanvasSyncPayload(payload)) {
          this.handlers.onCanvasSync?.(message as WebSocketMessage<CanvasSyncPayload>)
        }
        break
      case 'physics:throw':
      case 'physics:collision':
      case 'physics:attract':
      case 'physics:repel':
        if (isPhysicsPayload(payload)) {
          this.handlers.onPhysicsEvent?.(message as WebSocketMessage<PhysicsPayload>)
        }
        break
      case 'physics:enabled':
        if (isPhysicsEnabledPayload(payload)) {
          this.handlers.onPhysicsEnabled?.(message as WebSocketMessage<PhysicsEnabledPayload>)
        }
        break
      case 'physics:gravity':
        if (isPhysicsGravityPayload(payload)) {
          this.handlers.onPhysicsGravity?.(message as WebSocketMessage<PhysicsGravityPayload>)
        }
        break
      case 'connection:error':
      case 'room:error':
      case 'error':
        this.handlers.onError?.(payload as ErrorPayload)
        break
      default:
        console.debug('[WebSocketClient] Unhandled message type:', type)
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('connection:init', { type: 'heartbeat' })
      }
    }, this.config.heartbeatInterval || 30000)
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Set connection state
   */
  private setState(state: ConnectionState): void {
    this.state = state
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.stopHeartbeat()
  }
}

/**
 * Create a WebSocket client instance
 */
export function createWebSocketClient(config: WebSocketConfig): WebSocketClient {
  return new WebSocketClient(config)
}
