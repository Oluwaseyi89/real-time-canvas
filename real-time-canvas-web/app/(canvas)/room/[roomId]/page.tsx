'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useRoom } from '@/hooks/useRoom'
import { useAuth } from '@/hooks/useAuth'
import { ZoomControls } from '@/components/canvas/ZoomControls'
import { Toolbar } from '@/components/canvas/tools/Toolbar'
import { CursorTracker } from '@/components/collaboration/CursorTracker'
import { RoomInvite } from '@/components/room/RoomInvite'
import { RoomInfo } from '@/components/room/RoomInfo'
import { useCanvasStore } from '@/store/canvasStore'
import { useWebSocketStore } from '@/store/websocketStore'

export default function CanvasRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { username } = useAuth()
  const { currentRoom, joinRoom, leaveRoom, isInRoom } = useRoom()
  const [isReady, setIsReady] = useState(false)
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false)
  const [userId] = useState(() => `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`)

  const {
    canvasRef,
    containerRef,
    zoom,
    addText,
    addRectangle,
    addCircle,
    addStickyNote,
    addImage,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    isInitialized,
  } = useCanvas({
    onObjectAdded: (obj) => {
      const custom = obj as any
      if (custom.id && custom.type) {
        send('object:create', {
          objectId: custom.id,
          type: custom.type,
          data: custom.toObject ? custom.toObject() : {},
          position: { x: custom.left || 0, y: custom.top || 0 },
        })
      }
    },
  })

  // WebSocket setup
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  const { isConnected, send, subscribe, connect, disconnect } = useWebSocket({
    url: wsUrl,
    roomId,
    userId,
    username: username || 'Guest',
    autoConnect: false,
    onConnect: () => {
      console.log('[CanvasRoom] WebSocket connected')
    },
    onDisconnect: () => {
      console.log('[CanvasRoom] WebSocket disconnected')
    },
    onError: (error) => {
      console.error('[CanvasRoom] WebSocket error:', error)
    },
  })

  // Load username from session storage
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    if (storedUsername) {
      setIsReady(true)
    } else {
      router.push('/')
    }
  }, [router])

  // Join room when ready
  useEffect(() => {
    if (isReady && username && !isInRoom) {
      joinRoom(roomId)
    }
  }, [isReady, username, roomId, joinRoom, isInRoom])

  // Connect WebSocket when in room
  useEffect(() => {
    if (isReady && username && isInRoom) {
      connect()
    }
    return () => {
      disconnect()
    }
  }, [isReady, username, isInRoom, connect, disconnect])

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected) return

    const unsubscribeCreate = subscribe('object:create', (message) => {
      console.log('[CanvasRoom] Object created by other user:', message.payload)
    })

    const unsubscribeUpdate = subscribe('object:update', (message) => {
      console.log('[CanvasRoom] Object updated:', message.payload)
    })

    const unsubscribePresence = subscribe('user:presence', (message) => {
      useWebSocketStore.getState().addUser(message.payload as any)
    })

    return () => {
      unsubscribeCreate()
      unsubscribeUpdate()
      unsubscribePresence()
    }
  }, [isConnected, subscribe])

  // Leave room on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [leaveRoom])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-canvas-bg">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full relative"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Cursor tracker for remote users */}
      <CursorTracker canvasRef={canvasRef} />

      {/* Toolbar - positioned top-left */}
      <div className="absolute top-4 left-4 z-20">
        <Toolbar />
      </div>

      {/* Room invite - positioned bottom-left */}
      <div className="absolute bottom-4 left-4 z-10 max-w-xs">
        <RoomInvite />
      </div>

      {/* Room info toggle */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <button
          onClick={() => setIsRoomInfoOpen(!isRoomInfoOpen)}
          className="px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-border-light text-sm text-gray-600 hover:bg-white transition-colors"
        >
          {isRoomInfoOpen ? '📋 Hide Info' : '📋 Room Info'}
        </button>
      </div>

      {/* Room info panel */}
      {isRoomInfoOpen && (
        <div className="absolute top-16 right-4 z-20 w-72 animate-in slide-in-from-top-2 duration-200">
          <RoomInfo />
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <ZoomControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          onFitToView={fitToView}
        />
      </div>

      {/* Room info overlay */}
      <div className="absolute top-4 right-20 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border-light text-sm min-w-[140px]">
        <div className="text-gray-700">
          <span className="font-medium">Room:</span> {roomId.slice(0, 8)}
        </div>
        <div className="text-gray-500 text-xs">
          <span className="font-medium">User:</span> {username}
        </div>
        <div className="text-gray-500 text-xs">
          <span className="font-medium">Zoom:</span> {Math.round(zoom * 100)}%
        </div>
        <div className="flex items-center gap-1 mt-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-gray-400 text-[10px] mt-1">
          {isInitialized ? '✅ Canvas ready' : '⏳ Initializing...'}
        </div>
      </div>

      {/* Canvas instructions */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow border border-border-light text-xs text-gray-500">
        🖱️ Scroll to zoom • Drag to pan • Click objects to select
      </div>
    </div>
  )
}
