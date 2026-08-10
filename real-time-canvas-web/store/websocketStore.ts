/**
 * Zustand store for WebSocket connection state
 *
 * Remote user/cursor state lives in store/collaborationStore.ts — this store
 * used to duplicate that as a second, never-written-to `users` map (nothing
 * called its addUser/updateUser/removeUser outside the store's own file,
 * while CursorTracker read from it, so cursors never rendered). Keeping two
 * sources of truth for the same data was the bug; this store now only tracks
 * the connection itself.
 */

import { create } from 'zustand'
import type { ConnectionState, WebSocketMessage } from '@/types/websocket'

interface WebSocketStore {
  // Connection state
  connectionState: ConnectionState
  isConnected: boolean
  reconnectAttempts: number

  // Message tracking
  messages: WebSocketMessage[]
  messageCount: number
  lastMessageAt: Date | null

  // Actions
  setConnectionState: (state: ConnectionState) => void
  setIsConnected: (connected: boolean) => void
  setReconnectAttempts: (attempts: number) => void
  addMessage: (message: WebSocketMessage) => void
  clearMessages: () => void
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
    })
  },
}))
