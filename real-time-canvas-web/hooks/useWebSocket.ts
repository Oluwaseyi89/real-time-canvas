/**
 * Custom hook for WebSocket client management
 * Provides WebSocket connection and event handling
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { WebSocketClient, createWebSocketClient } from '@/lib/websocket/client'
import { eventBus } from '@/lib/websocket/events'
import type { ConnectionState, WebSocketHandlers } from '@/types/websocket'

interface UseWebSocketOptions {
  url: string
  roomId: string
  userId: string
  username: string
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onReconnect?: (attempt: number) => void
  onError?: (error: any) => void
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    roomId,
    userId,
    username,
    autoConnect = true,
    reconnectAttempts = 0,
    reconnectDelay = 1000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    onConnect,
    onDisconnect,
    onReconnect,
    onError,
  } = options

  const [state, setState] = useState<ConnectionState>('disconnected')
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<WebSocketClient | null>(null)
  const handlersRef = useRef<WebSocketHandlers | null>(null)

  /**
   * Initialize WebSocket client
   */
  const initClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }

    const client = createWebSocketClient({
      url,
      roomId,
      userId,
      username,
      reconnectAttempts,
      reconnectDelay,
      maxReconnectAttempts,
      heartbeatInterval,
    })

    // Register event handlers
    client.on({
      onConnect: () => {
        setIsConnected(true)
        onConnect?.()
      },
      onDisconnect: () => {
        setIsConnected(false)
        onDisconnect?.()
      },
      onReconnect: (attempt) => {
        onReconnect?.(attempt)
      },
      onError: (error) => {
        onError?.(error)
      },
    })

    // Store client reference
    clientRef.current = client

    // Update state
    setState(client.getState())

    // Connect if autoConnect is enabled
    if (autoConnect) {
      client.connect()
    }

    return client
  }, [
    url,
    roomId,
    userId,
    username,
    autoConnect,
    reconnectAttempts,
    reconnectDelay,
    maxReconnectAttempts,
    heartbeatInterval,
    onConnect,
    onDisconnect,
    onReconnect,
    onError,
  ])

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect()
    } else {
      initClient()
    }
  }, [initClient])

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
  }, [])

  /**
   * Send a message
   */
  const send = useCallback(<T = unknown>(
    type: any,
    payload: T,
    options?: { priority?: boolean }
  ) => {
    if (clientRef.current) {
      return clientRef.current.send(type, payload, options)
    }
    return null
  }, [])

  /**
   * Subscribe to events
   */
  const subscribe = useCallback(<T = unknown>(
    type: any,
    handler: (message: any) => void
  ) => {
    return eventBus.on(type, handler)
  }, [])

  /**
   * Get connection state
   */
  const getState = useCallback(() => {
    if (clientRef.current) {
      return clientRef.current.getState()
    }
    return 'disconnected' as ConnectionState
  }, [])

  /**
   * Get reconnect attempts
   */
  const getReconnectAttempts = useCallback(() => {
    if (clientRef.current) {
      return clientRef.current.getReconnectAttempts()
    }
    return 0
  }, [])

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const client = initClient()

    return () => {
      if (client) {
        client.disconnect()
        clientRef.current = null
      }
    }
  }, [initClient])

  /**
   * Update connection state
   */
  useEffect(() => {
    if (clientRef.current) {
      setState(clientRef.current.getState())
    }
  }, [])

  /**
   * Poll for state changes
   */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (clientRef.current) {
      interval = setInterval(() => {
        const newState = clientRef.current?.getState()
        if (newState && newState !== state) {
          setState(newState)
        }
      }, 100)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
  }, [state])

  return {
    client: clientRef.current,
    state,
    isConnected,
    connect,
    disconnect,
    send,
    subscribe,
    getState,
    getReconnectAttempts,
  }
}
