/**
 * Custom hook for collaboration features
 * Provides user presence, cursor tracking, and object synchronization
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCollaborationStore } from '@/store/collaborationStore'
import { useWebSocket } from './useWebSocket'
import { useCanvas } from './useCanvas'
import type { 
  UserPresence, 
  CursorPosition, 
  ObjectSyncPayload,
  BatchSyncPayload 
} from '@/types/collaboration'

interface UseCollaborationOptions {
  roomId: string
  userId: string
  username: string
  enabled?: boolean
  onUserJoined?: (user: UserPresence) => void
  onUserLeft?: (userId: string) => void
  onCursorMove?: (cursor: CursorPosition) => void
}

export function useCollaboration(options: UseCollaborationOptions) {
  const {
    roomId,
    userId,
    username,
    enabled = true,
    onUserJoined,
    onUserLeft,
    onCursorMove,
  } = options

  const store = useCollaborationStore()
  const { send, isConnected, subscribe } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
    roomId,
    userId,
    username,
    autoConnect: false,
  })

  const [isInitialized, setIsInitialized] = useState(false)
  const cursorUpdateInterval = useRef<NodeJS.Timeout | null>(null)
  const lastCursorPosition = useRef<CursorPosition | null>(null)

  /**
   * Broadcast user presence to the room
   */
  const broadcastPresence = useCallback(() => {
    if (!isConnected) return

    const presence: UserPresence = {
      userId,
      username,
      isActive: true,
      lastSeen: Date.now(),
      cursor: lastCursorPosition.current || undefined,
    }

    send('user:presence', presence)
  }, [isConnected, userId, username, send])

  /**
   * Broadcast cursor position
   */
  const broadcastCursor = useCallback((position: CursorPosition) => {
    if (!isConnected) return

    lastCursorPosition.current = position
    send('user:cursor', {
      userId,
      position,
    })

    // Update local store
    store.updateCursor(userId, position)
    onCursorMove?.(position)
  }, [isConnected, userId, send, store, onCursorMove])

  /**
   * Broadcast typing status
   */
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!isConnected) return
    send('user:typing', { userId, isTyping, timestamp: Date.now() })
    store.setTyping(userId, isTyping)
  }, [isConnected, userId, send, store])

  /**
   * Sync an object to other clients
   */
  const syncObject = useCallback((payload: ObjectSyncPayload) => {
    if (!isConnected) return
    send('object:sync', payload)
  }, [isConnected, send])

  /**
   * Sync multiple objects in batch
   */
  const syncBatch = useCallback((payload: BatchSyncPayload) => {
    if (!isConnected) return
    send('canvas:sync', payload)
  }, [isConnected, send])

  /**
   * Initialize collaboration
   */
  const initialize = useCallback(() => {
    if (isInitialized) return

    // Broadcast initial presence
    broadcastPresence()

    // Set up cursor tracking interval
    if (cursorUpdateInterval.current) {
      clearInterval(cursorUpdateInterval.current)
    }

    cursorUpdateInterval.current = setInterval(() => {
      // Broadcast cursor position periodically (for active users)
      if (lastCursorPosition.current && isConnected) {
        broadcastCursor(lastCursorPosition.current)
      }
    }, 2000) // Update every 2 seconds

    setIsInitialized(true)
  }, [isInitialized, broadcastPresence, isConnected, broadcastCursor])

  /**
   * Clean up collaboration
   */
  const cleanup = useCallback(() => {
    if (cursorUpdateInterval.current) {
      clearInterval(cursorUpdateInterval.current)
      cursorUpdateInterval.current = null
    }

    // Broadcast user leaving
    if (isConnected) {
      send('user:left', { userId })
      store.removeUser(userId)
    }

    setIsInitialized(false)
  }, [isConnected, userId, send, store])

  /**
   * Set up WebSocket event subscriptions
   */
  useEffect(() => {
    if (!isConnected || !enabled) return

    // Subscribe to user presence updates
    const unsubscribePresence = subscribe('user:presence', (message) => {
      const presence = message.payload as UserPresence
      if (presence.userId === userId) return // Skip self
      
      store.addUser(presence)
      onUserJoined?.(presence)
    })

    // Subscribe to cursor updates
    const unsubscribeCursor = subscribe('user:cursor', (message) => {
      const data = message.payload as { userId: string; position: CursorPosition }
      if (data.userId === userId) return // Skip self
      
      store.updateCursor(data.userId, data.position)
    })

    // Subscribe to typing indicators
    const unsubscribeTyping = subscribe('user:typing', (message) => {
      const data = message.payload as { userId: string; isTyping: boolean }
      if (data.userId === userId) return // Skip self
      
      store.setTyping(data.userId, data.isTyping)
    })

    // Subscribe to user left events
    const unsubscribeLeft = subscribe('user:left', (message) => {
      const data = message.payload as { userId: string }
      if (data.userId === userId) return // Skip self
      
      store.removeUser(data.userId)
      onUserLeft?.(data.userId)
    })

    // Subscribe to object sync
    const unsubscribeObject = subscribe('object:sync', (message) => {
      const payload = message.payload as ObjectSyncPayload
      // Handle object sync
    })

    // Subscribe to batch sync
    const unsubscribeBatch = subscribe('canvas:sync', (message) => {
      const payload = message.payload as BatchSyncPayload
      // Handle batch sync
    })

    return () => {
      unsubscribePresence()
      unsubscribeCursor()
      unsubscribeTyping()
      unsubscribeLeft()
      unsubscribeObject()
      unsubscribeBatch()
    }
  }, [isConnected, enabled, userId, subscribe, store, onUserJoined, onUserLeft])

  /**
   * Initialize collaboration on mount
   */
  useEffect(() => {
    if (!enabled || !isConnected) return
    
    initialize()

    return () => {
      cleanup()
    }
  }, [enabled, isConnected, initialize, cleanup])

  return {
    isConnected,
    isInitialized,
    users: store.users,
    activeUsers: store.getActiveUsers(),
    userCount: store.userCount,
    broadcastPresence,
    broadcastCursor,
    broadcastTyping,
    syncObject,
    syncBatch,
    cleanup,
    getTypingUsers: () => store.typingUsers,
    getUserCursor: (userId: string) => {
      const user = store.getUser(userId)
      return user?.cursor || null
    },
  }
}
