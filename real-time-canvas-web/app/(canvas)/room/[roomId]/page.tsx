'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useRoom } from '@/hooks/useRoom'
import { useAuth } from '@/hooks/useAuth'
import { useCollaboration } from '@/hooks/useCollaboration'
import { usePhysics } from '@/hooks/usePhysics'
import { useMinimap } from '@/hooks/useMinimap'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useTimeTravel } from '@/hooks/useTimeTravel'
import { ExportModal } from '@/components/export/ExportModal'
import { ZoomControls } from '@/components/canvas/ZoomControls'
import { Toolbar } from '@/components/canvas/tools/Toolbar'
import { PhysicsControls } from '@/components/canvas/physics/PhysicsControls'
import { TimeTravelControls } from '@/components/canvas/TimeTravelControls'
import { Minimap } from '@/components/canvas/minimap/Minimap'
import { CursorTracker } from '@/components/collaboration/CursorTracker'
import { UserPresence } from '@/components/collaboration/UserPresence'
import { TypingIndicator } from '@/components/collaboration/TypingIndicator'
import { RoomInvite } from '@/components/room/RoomInvite'
import { RoomInfo } from '@/components/room/RoomInfo'
import { useCanvasStore } from '@/store/canvasStore'
import { Object as FabricObject } from 'fabric'

export default function CanvasRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { username } = useAuth()
  const { currentRoom, joinRoom, leaveRoom, isInRoom } = useRoom()
  const [isReady, setIsReady] = useState(false)
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [userId] = useState(() => `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`)
  
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)

  // Offline sync setup
  const {
    queueOperation,
    processQueue,
    status: offlineStatus,
    isReady: offlineReady,
  } = useOfflineSync({
    roomId,
    userId,
    enabled: true,
  })

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
    onObjectAdded: async (obj) => {
      const custom = obj as any
      if (custom.id && custom.type) {
        // Record event for time travel
        recordEvent('object:create', {
          objectId: custom.id,
          type: custom.type,
          data: custom.toObject ? custom.toObject() : {},
          position: { x: custom.left || 0, y: custom.top || 0 },
        })

        try {
          await queueOperation('object:create', {
            objectId: custom.id,
            type: custom.type,
            data: custom.toObject ? custom.toObject() : {},
            position: { x: custom.left || 0, y: custom.top || 0 },
            userId,
            timestamp: Date.now(),
          })
        } catch (error) {
          console.error('[CanvasRoom] Failed to queue operation:', error)
        }

        syncObject({
          objectId: custom.id,
          type: custom.type,
          data: custom.toObject ? custom.toObject() : {},
          version: 1,
          userId: userId,
          timestamp: Date.now(),
        })

        if (physicsEngine) {
          addPhysicsBodyForObject(obj)
        }
      }
    },
  })

  // Time travel setup
  const { recordEvent, isRecording, isReplaying } = useTimeTravel({
    enabled: true,
    autoRecord: true,
    maxEvents: 10000,
  })

  // Physics setup
  const { 
    engine: physicsEngine,
    isRunning: isPhysicsRunning,
    addBody,
    removeBody,
    throwBody,
    attractBody,
    repelBody,
    initEngine,
  } = usePhysics({
    enabled: true,
    gravity: { x: 0, y: 1 },
    autoStart: true,
    onCollision: (bodyA, bodyB) => {
      console.log('[Physics] Collision:', bodyA.id, bodyB.id)
      send('physics:collision', {
        objectId: bodyA.id,
        targetId: bodyB.id,
        force: 5,
      })
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
      if (offlineReady) {
        processQueue()
      }
    },
    onDisconnect: () => {
      console.log('[CanvasRoom] WebSocket disconnected')
    },
    onError: (error) => {
      console.error('[CanvasRoom] WebSocket error:', error)
    },
  })

  // Collaboration setup
  const { 
    broadcastCursor, 
    broadcastTyping,
    syncObject,
    users 
  } = useCollaboration({
    roomId,
    userId,
    username: username || 'Guest',
    enabled: isConnected,
  })

  // Minimap is auto-initialized via hook
  useMinimap()

  const lastCursorPos = useRef<{ x: number; y: number } | null>(null)

  const addPhysicsBodyForObject = useCallback((obj: FabricObject) => {
    const custom = obj as any
    if (!custom.id || !physicsEngine) return

    const bodyConfig = {
      id: custom.id,
      type: 'rectangle' as const,
      x: (obj.left || 0) + (obj.width || 50) / 2,
      y: (obj.top || 0) + (obj.height || 50) / 2,
      width: obj.width || 50,
      height: obj.height || 50,
      restitution: 0.5,
      friction: 0.1,
      density: 0.001,
      plugin: {
        canvasObjectId: custom.id,
        metadata: {
          type: custom.type,
          createdAt: new Date(),
        },
      },
    }

    const body = addBody(bodyConfig, obj)
    return body
  }, [physicsEngine, addBody])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasElementRef.current
    if (!canvas || !isConnected) return
    
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height
    
    lastCursorPos.current = { x, y }
    broadcastCursor({
      x,
      y,
      timestamp: Date.now(),
    })
  }, [isConnected, broadcastCursor])

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

  // Set up mouse event listeners
  useEffect(() => {
    const canvas = canvasElementRef.current
    if (!canvas) return
    
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', () => {
      lastCursorPos.current = null
    })
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleMouseMove])

  // Initialize physics engine when canvas is ready
  useEffect(() => {
    if (isInitialized && canvasRef.current) {
      const canvas = (canvasRef as any).current
      if (canvas) {
        initEngine(canvas)
      }
    }
  }, [isInitialized, canvasRef, initEngine])

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
          ref={(el) => {
            canvasElementRef.current = el
            if (canvasRef) {
              ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el
            }
          }}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Cursor tracker for remote users */}
      <CursorTracker canvasRef={canvasElementRef} />

      {/* Toolbar - positioned top-left */}
      <div className="absolute top-4 left-4 z-20">
        <Toolbar />
      </div>

      {/* User presence - positioned top center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <UserPresence className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border-light" />
      </div>

      {/* Physics controls - positioned top-right */}
      <div className="absolute top-20 right-4 z-20 w-56">
        <PhysicsControls />
      </div>

      {/* Time travel controls - positioned bottom-left */}
      <TimeTravelControls />

      {/* Export button - positioned next to room info */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-border-light text-sm text-gray-600 hover:bg-white transition-colors"
          title="Export Canvas"
        >
          📤 Export
        </button>
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

      {/* Minimap - positioned bottom-right */}
      <Minimap className="bottom-4 right-4" />

      {/* Room invite - positioned bottom-left */}
      <div className="absolute bottom-4 left-4 z-10 max-w-xs">
        <RoomInvite />
      </div>

      {/* Typing indicator - positioned bottom-center */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
        <TypingIndicator className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg shadow border border-border-light" />
      </div>

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

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Room info overlay */}
      <div className="absolute top-4 right-24 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border-light text-sm min-w-[140px]">
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
        <div className="text-gray-400 text-[10px] mt-0.5">
          {isPhysicsRunning ? '⚡ Physics active' : '⏸️ Physics paused'}
        </div>
        <div className="text-gray-400 text-[10px] mt-0.5">
          {isRecording ? '⏺️ Recording' : isReplaying ? '▶️ Replaying' : '⏹️ Idle'}
        </div>
        {offlineStatus.pendingCount > 0 && (
          <div className="text-gray-400 text-[10px] mt-0.5">
            📦 {offlineStatus.pendingCount} offline operations pending
          </div>
        )}
        {!offlineStatus.isOnline && (
          <div className="text-yellow-500 text-[10px] mt-0.5">
            📡 Offline mode
          </div>
        )}
      </div>

      {/* Canvas instructions */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow border border-border-light text-xs text-gray-500">
        🖱️ Scroll to zoom • Drag to pan • Click objects to select • ⚡ Physics enabled • 🗺️ Radar shows users • 📦 Offline support • 📤 Export canvas • ⏱️ Time travel
      </div>
    </div>
  )
}
