/**
 * Room management types
 * Defines room data structures and authentication types
 */

/**
 * Room role for users
 */
export type RoomRole = 'owner' | 'editor' | 'viewer'

/**
 * Room user with role
 */
export interface RoomUser {
  userId: string
  username: string
  role: RoomRole
  joinedAt: Date
  lastActiveAt: Date
}

/**
 * Room data structure
 */
export interface Room {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  users: RoomUser[]
  isPrivate: boolean
  inviteCode?: string
  settings: RoomSettings
  objectCount: number
  lastActivity: Date
}

/**
 * Room settings
 */
export interface RoomSettings {
  allowGuestUsers: boolean
  allowObjectEditing: boolean
  allowPhysics: boolean
  maxUsers: number
  canvasBackground: string
}

/**
 * Room creation request
 */
export interface CreateRoomRequest {
  name: string
  username: string
  isPrivate?: boolean
  settings?: Partial<RoomSettings>
}

/**
 * Room join request
 */
export interface JoinRoomRequest {
  roomId: string
  username: string
  inviteCode?: string
}

/**
 * Room invitation
 */
export interface RoomInvitation {
  id: string
  roomId: string
  code: string
  createdBy: string
  createdAt: Date
  expiresAt: Date
  usedBy?: string
  usedAt?: Date
  maxUses: number
  useCount: number
}

/**
 * Room list response
 */
export interface RoomListResponse {
  rooms: Room[]
  total: number
  page: number
  limit: number
}

/**
 * Guest user session
 */
export interface GuestSession {
  userId: string
  username: string
  roomId: string
  joinedAt: Date
  expiresAt: Date
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  username: string | null
  roomId: string | null
  guestMode: boolean
  token?: string
}
