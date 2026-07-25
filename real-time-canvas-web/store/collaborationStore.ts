/**
 * Zustand store for collaboration state
 * Manages user presence, cursors, and typing indicators
 */

import { create } from 'zustand'
import { 
  UserPresence, 
  CollaborationState, 
  CursorPosition,
  TypingIndicator 
} from '@/types/collaboration'

interface CollaborationStore extends CollaborationState {
  // Actions
  addUser: (user: UserPresence) => void
  removeUser: (userId: string) => void
  updateUser: (userId: string, updates: Partial<UserPresence>) => void
  updateCursor: (userId: string, cursor: CursorPosition) => void
  setTyping: (userId: string, isTyping: boolean) => void
  clearAllUsers: () => void
  getUser: (userId: string) => UserPresence | undefined
  getActiveUsers: () => UserPresence[]
  reset: () => void
}

export const useCollaborationStore = create<CollaborationStore>((set, get) => ({
  // Initial state
  users: new Map(),
  activeUsers: [],
  typingUsers: [],
  userCount: 0,
  lastSync: Date.now(),

  /**
   * Add a user to the collaboration state
   */
  addUser: (user: UserPresence) => {
    const { users } = get()
    const newUsers = new Map(users)
    newUsers.set(user.userId, user)
    
    set({
      users: newUsers,
      activeUsers: Array.from(newUsers.values())
        .filter(u => u.isActive)
        .map(u => u.userId),
      userCount: newUsers.size,
    })
  },

  /**
   * Remove a user from the collaboration state
   */
  removeUser: (userId: string) => {
    const { users, typingUsers } = get()
    const newUsers = new Map(users)
    newUsers.delete(userId)
    
    set({
      users: newUsers,
      activeUsers: Array.from(newUsers.values())
        .filter(u => u.isActive)
        .map(u => u.userId),
      userCount: newUsers.size,
      typingUsers: typingUsers.filter(id => id !== userId),
    })
  },

  /**
   * Update a user's presence information
   */
  updateUser: (userId: string, updates: Partial<UserPresence>) => {
    const { users } = get()
    const existing = users.get(userId)
    if (!existing) return

    const updated = { ...existing, ...updates, lastSeen: Date.now() }
    const newUsers = new Map(users)
    newUsers.set(userId, updated)

    set({
      users: newUsers,
      activeUsers: Array.from(newUsers.values())
        .filter(u => u.isActive)
        .map(u => u.userId),
    })
  },

  /**
   * Update a user's cursor position
   */
  updateCursor: (userId: string, cursor: CursorPosition) => {
    const { users } = get()
    const existing = users.get(userId)
    if (!existing) return

    const updated = { 
      ...existing, 
      cursor: { ...cursor, timestamp: Date.now() },
      lastSeen: Date.now()
    }
    const newUsers = new Map(users)
    newUsers.set(userId, updated)

    set({ users: newUsers })
  },

  /**
   * Set typing indicator for a user
   */
  setTyping: (userId: string, isTyping: boolean) => {
    const { users, typingUsers } = get()
    const existing = users.get(userId)
    if (!existing) return

    const updated = { ...existing, isTyping, lastSeen: Date.now() }
    const newUsers = new Map(users)
    newUsers.set(userId, updated)

    const newTypingUsers = isTyping
      ? [...typingUsers, userId]
      : typingUsers.filter(id => id !== userId)

    set({
      users: newUsers,
      typingUsers: newTypingUsers,
    })
  },

  /**
   * Clear all users from the collaboration state
   */
  clearAllUsers: () => {
    set({
      users: new Map(),
      activeUsers: [],
      typingUsers: [],
      userCount: 0,
    })
  },

  /**
   * Get a user by ID
   */
  getUser: (userId: string) => {
    return get().users.get(userId)
  },

  /**
   * Get all active users
   */
  getActiveUsers: () => {
    return Array.from(get().users.values()).filter(u => u.isActive)
  },

  /**
   * Reset the store
   */
  reset: () => {
    set({
      users: new Map(),
      activeUsers: [],
      typingUsers: [],
      userCount: 0,
      lastSync: Date.now(),
    })
  },
}))
