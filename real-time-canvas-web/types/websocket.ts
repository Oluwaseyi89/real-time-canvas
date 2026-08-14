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
  | 'user:joined'
  | 'user:left'
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
  | 'physics:enabled'
  | 'physics:gravity'
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
  avatarUrl?: string
  isTyping?: boolean
  selectedTool?: string
  activeTool?: string
  currentObjectId?: string
  viewport?: {
    zoom: number
    pan: { x: number; y: number }
  }
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
 *
 * position/strength/radius are only populated for 'attract'/'repel' — each
 * client's Matter engine is independent (no server-side physics authority),
 * so cross-client sync works by replaying the same *command* (throw a body
 * with this velocity, attract toward this point) on every client's own
 * simulation rather than broadcasting continuous position updates.
 */
export interface PhysicsPayload {
  objectId: string
  type: 'throw' | 'collision' | 'attract' | 'repel'
  velocity?: { x: number; y: number }
  force?: number
  targetId?: string
  position?: { x: number; y: number }
  strength?: number
  radius?: number
}

/**
 * Physics enabled/disabled toggle payload — lets every client agree on
 * whether objects are participating in the simulation at all.
 */
export interface PhysicsEnabledPayload {
  enabled: boolean
}

/**
 * Gravity change payload
 */
export interface PhysicsGravityPayload {
  gravity: { x: number; y: number }
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
  // Object/canvas/physics handlers receive the full message (not just the
  // payload) because downstream consumers need message.userId for attribution.
  onObjectCreate?: (message: WebSocketMessage<ObjectCreatePayload>) => void
  onObjectUpdate?: (message: WebSocketMessage<ObjectUpdatePayload>) => void
  onObjectDelete?: (message: WebSocketMessage<ObjectDeletePayload>) => void
  onUserPresence?: (presence: UserPresence) => void
  onCursorMove?: (position: CursorPosition) => void
  onCanvasSync?: (message: WebSocketMessage<CanvasSyncPayload>) => void
  onPhysicsEvent?: (message: WebSocketMessage<PhysicsPayload>) => void
  onPhysicsEnabled?: (message: WebSocketMessage<PhysicsEnabledPayload>) => void
  onPhysicsGravity?: (message: WebSocketMessage<PhysicsGravityPayload>) => void
  onRoomJoined?: (roomId: string, users: UserPresence[]) => void
  onUserJoined?: (payload: { userId: string; username: string }) => void
  onUserLeft?: (payload: { userId: string }) => void
}