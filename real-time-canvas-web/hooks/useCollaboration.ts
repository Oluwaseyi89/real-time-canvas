/**
 * Custom hook for collaboration features
 * Provides user presence, cursor tracking, and object synchronization.
 *
 * Does NOT open its own WebSocket connection — it registers its incoming-message
 * handlers directly onto the shared `client` created by the room's single
 * `useWebSocket()` call, and sends outgoing messages through the shared `send`.
 * (Previously this hook called `useWebSocket()` internally, which opened a
 * second, independent socket per room session and left `send`/`isConnected`
 * out of sync with the room page's own connection.)
 *
 * Reads/writes collaborationStore via `getState()`/actions only — it never
 * subscribes to the store reactively. Components that need to *render* live
 * presence/cursor data (UserPresence, TypingIndicator, CursorTracker, the
 * minimap) subscribe to collaborationStore themselves. Subscribing here too
 * previously caused two feedback loops: (1) `store` — the whole state object,
 * a new reference on every update — sat in the deps of callbacks like
 * `cleanup`, which itself calls `store.removeUser(...)`, so tearing down and
 * re-running the owning effect fed back into itself as a "Maximum update
 * depth exceeded" crash; (2) the same instability fed into useWebSocket's
 * connect/disconnect identity, producing a reconnect storm (hundreds of
 * WS connections/sec) once live presence data started flowing.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useCollaborationStore } from '@/store/collaborationStore'
import type { WebSocketClient } from '@/lib/websocket/client'
import type {
  ObjectCreatePayload,
  ObjectUpdatePayload,
  ObjectDeletePayload,
} from '@/types/websocket'
import type {
  UserPresence,
  CursorPosition,
} from '@/types/collaboration'

interface UseCollaborationOptions {
  roomId: string
  userId: string
  username: string
  client: WebSocketClient | null
  send: <T = unknown>(type: any, payload: T, options?: { priority?: boolean }) => string | null
  isConnected: boolean
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
    client,
    send,
    isConnected,
    enabled = true,
    onUserJoined,
    onUserLeft,
    onCursorMove,
  } = options

  // A ref, not state: `initialize`/`cleanup` are themselves an effect's
  // body/teardown pair, so state here would recreate the classic ping-pong —
  // initialize() flips it true (new `initialize` identity) -> effect deps
  // change -> React re-runs the effect, calling the *previous* cleanup()
  // first -> cleanup() unconditionally flips it back false (new identity
  // again) -> effect re-runs again -> initialize() sees it false and fires
  // again -> forever ("Maximum update depth exceeded"). Nothing outside this
  // hook reads the initialized flag, so a ref carries no downside.
  const isInitializedRef = useRef(false)
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
      ...position,
    })

    onCursorMove?.(position)
  }, [isConnected, userId, send, onCursorMove])

  /**
   * Broadcast typing status
   */
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!isConnected) return
    send('user:typing', { userId, isTyping, timestamp: Date.now() })
    useCollaborationStore.getState().setTyping(userId, isTyping)
  }, [isConnected, userId, send])

  /**
   * Broadcast a newly created object to other clients
   */
  const broadcastObjectCreate = useCallback((payload: ObjectCreatePayload) => {
    if (!isConnected) return
    send('object:create', payload)
  }, [isConnected, send])

  /**
   * Broadcast an object update (move/resize/style change) to other clients
   */
  const broadcastObjectUpdate = useCallback((payload: ObjectUpdatePayload) => {
    if (!isConnected) return
    send('object:update', payload)
  }, [isConnected, send])

  /**
   * Broadcast an object deletion to other clients
   */
  const broadcastObjectDelete = useCallback((payload: ObjectDeletePayload) => {
    if (!isConnected) return
    send('object:delete', payload)
  }, [isConnected, send])

  /**
   * Initialize collaboration
   */
  const initialize = useCallback(() => {
    if (isInitializedRef.current) return

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

    isInitializedRef.current = true
  }, [broadcastPresence, isConnected, broadcastCursor])

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
      useCollaborationStore.getState().removeUser(userId)
    }

    isInitializedRef.current = false
  }, [isConnected, userId, send])

  /**
   * Register incoming-message handlers directly on the shared client.
   * `client.on()` merges handler objects, so this can coexist with the
   * object/canvas/physics handlers registered elsewhere on the same client.
   */
  useEffect(() => {
    if (!client || !enabled) return

    client.on({
      // The server replays the room's current member list only on this
      // message (sent once, right after this client's own room:join) — it
      // never came from anywhere else, so a client that joins a room with
      // people already in it saw 0 users until one of them happened to
      // re-broadcast presence (the onUserJoined re-announce below only
      // helps the *other* direction: already-present clients learning
      // about a new joiner, not the new joiner learning about them).
      onRoomJoined: (_roomId, users) => {
        const store = useCollaborationStore.getState()
        users.forEach((presence) => {
          if (presence.userId === userId || store.users.has(presence.userId)) return
          store.addUser({
            userId: presence.userId,
            username: presence.username,
            isActive: presence.isActive,
            lastSeen: presence.lastSeen,
            isTyping: presence.isTyping,
            selectedTool: presence.selectedTool,
            cursor: presence.cursor
              ? { x: presence.cursor.x, y: presence.cursor.y, timestamp: Date.now() }
              : undefined,
          })
        })
      },

      onUserPresence: (presence) => {
        if (presence.userId === userId) return // Skip self

        const normalized: UserPresence = {
          userId: presence.userId,
          username: presence.username,
          isActive: presence.isActive,
          lastSeen: presence.lastSeen,
          isTyping: presence.isTyping,
          selectedTool: presence.selectedTool,
          cursor: presence.cursor
            ? { x: presence.cursor.x, y: presence.cursor.y, timestamp: Date.now() }
            : undefined,
        }

        const store = useCollaborationStore.getState()
        if (store.users.has(normalized.userId)) {
          store.updateUser(normalized.userId, normalized)
        } else {
          store.addUser(normalized)
        }
        onUserJoined?.(normalized)
      },

      onCursorMove: (position) => {
        if (position.userId === userId) return // Skip self

        const cursor: CursorPosition = {
          x: position.x,
          y: position.y,
          objectId: position.objectId,
          timestamp: Date.now(),
        }

        const store = useCollaborationStore.getState()
        if (!store.users.has(position.userId)) {
          // Cursor arrived before a presence broadcast — seed a minimal entry
          store.addUser({
            userId: position.userId,
            username: 'Collaborator',
            isActive: true,
            lastSeen: Date.now(),
            cursor,
          })
        } else {
          store.updateCursor(position.userId, cursor)
        }
      },

      onUserJoined: (payload) => {
        if (payload.userId === userId) return // Skip self

        const store = useCollaborationStore.getState()
        if (!store.users.has(payload.userId)) {
          store.addUser({
            userId: payload.userId,
            username: payload.username,
            isActive: true,
            lastSeen: Date.now(),
          })
        }

        // Re-announce our own presence so the newly-joined client learns
        // about users who were already in the room before it connected
        // (the server only replays room history to an explicit room:join).
        broadcastPresence()
      },

      onUserLeft: (payload) => {
        if (payload.userId === userId) return // Skip self

        useCollaborationStore.getState().removeUser(payload.userId)
        onUserLeft?.(payload.userId)
      },
    })
  }, [client, enabled, userId, onUserJoined, onUserLeft, broadcastPresence])

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
    broadcastPresence,
    broadcastCursor,
    broadcastTyping,
    broadcastObjectCreate,
    broadcastObjectUpdate,
    broadcastObjectDelete,
    cleanup,
  }
}
