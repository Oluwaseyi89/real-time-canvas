/**
 * WebSocket types for real-time communication
 * Defines all message types, payloads, and event handlers
 */

/**
 * WebSocket connection states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  // Connection events
  | 'connection:init'
  | 'connection:ack'
  | 'connection:error'
  // Room events
  | 'room:join'
  | 'room:leave'
  | 'room:joined'
  | 'room:left'
  | 'room:error'
  // User events
  | 'user:presence'
  | 'user:cursor'
  | 'user:typing'
  // Object events
  | 'object:create'
  | 'object:update'
  | 'object:delete'
  | 'object:move'
  | 'object:select'
  // Canvas events
  | 'canvas:sync'
  | 'canvas:state'
  | 'canvas:clear'
  // Physics events
  | 'physics:throw'
  | 'physics:collision'
  | 'physics:attract'
  | 'physics:repel'
  // Error events
  | 'error'

/**
 * Base WebSocket message interface
 */
export interface WebSocketMessage<T = unknown> {
  id: string
  type: WebSocketMessageType
  roomId: string
  userId: string
  timestamp: number
  payload: T
}

/**
 * User presence data
 */
export interface UserPresence {
  userId: string
  username: string
  cursor?: { x: number; y: number }
  isActive: boolean
  lastSeen: number
}

/**
 * Cursor position data
 */
export interface CursorPosition {
  userId: string
  x: number
  y: number
  objectId?: string
}

/**
 * Object creation payload
 */
export interface ObjectCreatePayload {
  objectId: string
  type: string
  data: Record<string, unknown>
  position: { x: number; y: number }
}

/**
 * Object update payload
 */
export interface ObjectUpdatePayload {
  objectId: string
  updates: Record<string, unknown>
  userId: string
}

/**
 * Object delete payload
 */
export interface ObjectDeletePayload {
  objectId: string
  userId: string
}

/**
 * Canvas sync payload
 */
export interface CanvasSyncPayload {
  objects: Array<{
    id: string
    type: string
    data: Record<string, unknown>
  }>
  version: number
  timestamp: number
}

/**
 * Physics interaction payload
 */
export interface PhysicsPayload {
  objectId: string
  type: 'throw' | 'collision' | 'attract' | 'repel'
  velocity?: { x: number; y: number }
  force?: number
  targetId?: string
}

/**
 * Error payload
 */
export interface ErrorPayload {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * WebSocket event handler map
 */
export interface WebSocketHandlers {
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: (attempt: number) => void
  onError?: (error: ErrorPayload) => void
  onMessage?: <T>(message: WebSocketMessage<T>) => void
  onObjectCreate?: (payload: ObjectCreatePayload) => void
  onObjectUpdate?: (payload: ObjectUpdatePayload) => void
  onObjectDelete?: (payload: ObjectDeletePayload) => void
  onUserPresence?: (presence: UserPresence) => void
  onCursorMove?: (position: CursorPosition) => void
  onCanvasSync?: (payload: CanvasSyncPayload) => void
  onPhysicsEvent?: (payload: PhysicsPayload) => void
  onRoomJoined?: (roomId: string, users: UserPresence[]) => void
  onUserJoined?: (user: UserPresence) => void
  onUserLeft?: (userId: string) => void
}
