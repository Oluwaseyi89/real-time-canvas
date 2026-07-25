/**
 * Zustand store for WebSocket state management
 * Handles connection state, messages, and event tracking
 */

import { create } from 'zustand'
import type { ConnectionState, WebSocketMessage, UserPresence } from '@/types/websocket'

interface WebSocketStore {
  // Connection state
  connectionState: ConnectionState
  isConnected: boolean
  reconnectAttempts: number
  
  // Message tracking
  messages: WebSocketMessage[]
  messageCount: number
  lastMessageAt: Date | null
  
  // Users in room
  users: Map<string, UserPresence>
  userCount: number
  
  // Actions
  setConnectionState: (state: ConnectionState) => void
  setIsConnected: (connected: boolean) => void
  setReconnectAttempts: (attempts: number) => void
  addMessage: (message: WebSocketMessage) => void
  clearMessages: () => void
  addUser: (user: UserPresence) => void
  removeUser: (userId: string) => void
  updateUser: (userId: string, updates: Partial<UserPresence>) => void
  clearUsers: () => void
  reset: () => void
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  // Initial state
  connectionState: 'disconnected',
  isConnected: false,
  reconnectAttempts: 0,
  messages: [],
  messageCount: 0,
  lastMessageAt: null,
  users: new Map(),
  userCount: 0,

  /**
   * Set connection state
   */
  setConnectionState: (state: ConnectionState) => {
    set({ connectionState: state })
  },

  /**
   * Set connection status
   */
  setIsConnected: (connected: boolean) => {
    set({ isConnected: connected })
  },

  /**
   * Set reconnect attempts
   */
  setReconnectAttempts: (attempts: number) => {
    set({ reconnectAttempts: attempts })
  },

  /**
   * Add a message to the store
   */
  addMessage: (message: WebSocketMessage) => {
    const { messages, messageCount } = get()
    // Keep only last 1000 messages
    const newMessages = [...messages, message]
    if (newMessages.length > 1000) {
      newMessages.shift()
    }
    set({
      messages: newMessages,
      messageCount: messageCount + 1,
      lastMessageAt: new Date(),
    })
  },

  /**
   * Clear all messages
   */
  clearMessages: () => {
    set({ messages: [], messageCount: 0, lastMessageAt: null })
  },

  /**
   * Add a user to the room
   */
  addUser: (user: UserPresence) => {
    const { users } = get()
    const newUsers = new Map(users)
    newUsers.set(user.userId, user)
    set({
      users: newUsers,
      userCount: newUsers.size,
    })
  },

  /**
   * Remove a user from the room
   */
  removeUser: (userId: string) => {
    const { users } = get()
    const newUsers = new Map(users)
    newUsers.delete(userId)
    set({
      users: newUsers,
      userCount: newUsers.size,
    })
  },

  /**
   * Update a user's presence
   */
  updateUser: (userId: string, updates: Partial<UserPresence>) => {
    const { users } = get()
    const existing = users.get(userId)
    if (existing) {
      const newUsers = new Map(users)
      newUsers.set(userId, { ...existing, ...updates })
      set({ users: newUsers })
    }
  },

  /**
   * Clear all users
   */
  clearUsers: () => {
    set({ users: new Map(), userCount: 0 })
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set({
      connectionState: 'disconnected',
      isConnected: false,
      reconnectAttempts: 0,
      messages: [],
      messageCount: 0,
      lastMessageAt: null,
      users: new Map(),
      userCount: 0,
    })
  },
}))
