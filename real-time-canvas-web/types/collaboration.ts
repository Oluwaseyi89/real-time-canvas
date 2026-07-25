/**
 * Collaboration types for real-time presence and synchronization
 */

import { WebSocketMessage } from './websocket'

/**
 * User presence state
 */
export interface UserPresence {
  userId: string
  username: string
  cursor?: CursorPosition
  isActive: boolean
  lastSeen: number
  currentObjectId?: string
  isTyping?: boolean
  selectedTool?: string
  viewport?: {
    zoom: number
    pan: { x: number; y: number }
  }
}

/**
 * Cursor position with optional target
 */
export interface CursorPosition {
  x: number
  y: number
  objectId?: string
  timestamp: number
}

/**
 * User typing indicator
 */
export interface TypingIndicator {
  userId: string
  isTyping: boolean
  timestamp: number
}

/**
 * Collaboration event types
 */
export type CollaborationEvent =
  | { type: 'user:joined'; payload: UserPresence }
  | { type: 'user:left'; payload: { userId: string } }
  | { type: 'user:presence'; payload: UserPresence }
  | { type: 'user:cursor'; payload: CursorPosition }
  | { type: 'user:typing'; payload: TypingIndicator }
  | { type: 'object:sync'; payload: any }
  | { type: 'canvas:sync'; payload: any }

/**
 * Collaboration state for a room
 */
export interface CollaborationState {
  users: Map<string, UserPresence>
  activeUsers: string[]
  typingUsers: string[]
  userCount: number
  lastSync: number
}

/**
 * Presence update payload
 */
export interface PresenceUpdate {
  userId: string
  username: string
  cursor?: CursorPosition
  isActive: boolean
  viewport?: {
    zoom: number
    pan: { x: number; y: number }
  }
}

/**
 * Cursor update payload
 */
export interface CursorUpdate {
  userId: string
  position: CursorPosition
}

/**
 * Object sync payload
 */
export interface ObjectSyncPayload {
  objectId: string
  type: string
  data: Record<string, unknown>
  version: number
  userId: string
  timestamp: number
}

/**
 * Batch sync payload for bulk operations
 */
export interface BatchSyncPayload {
  objects: ObjectSyncPayload[]
  version: number
  timestamp: number
}

/**
 * Collaboration event handler
 */
export interface CollaborationHandlers {
  onUserJoined?: (user: UserPresence) => void
  onUserLeft?: (userId: string) => void
  onUserPresence?: (presence: UserPresence) => void
  onCursorMove?: (cursor: CursorPosition) => void
  onTypingStart?: (userId: string) => void
  onTypingEnd?: (userId: string) => void
  onObjectSync?: (payload: ObjectSyncPayload) => void
  onBatchSync?: (payload: BatchSyncPayload) => void
}
