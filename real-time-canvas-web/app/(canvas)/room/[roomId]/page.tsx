'use client'

/**
 * World-Class Canvas Room Page
 * High-performance collaborative digital canvas workspace.
 * Features real-time multi-user synchronization, physics engine, time travel replay,
 * offline operations queue, and glassmorphic spatial control interface.
 */

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
import { useCanvasStore } from '@/store/canvasStore'
import { createWebSocketHandlers, type CanvasEventHandlerContext } from '@/lib/websocket/handlers'
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
import { Object as FabricObject } from 'fabric'

export default function CanvasRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { username } = useAuth()
  const { currentRoom, joinRoom, leaveRoom, isInRoom } = useRoom()

  // Control State
  const [isReady, setIsReady] = useState(false)
  const [isRoomInfoOpen, setIsRoomInfoOpen] = useState(false)
  const [isPhysicsOpen, setIsPhysicsOpen] = useState(false)
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [userId] = useState(() => `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`)

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const lastCursorPos = useRef<{ x: number; y: number } | null>(null)
  // Object IDs currently being removed as a result of an incoming WS delete —
  // lets onObjectRemoved distinguish "remote delete applied locally" (skip
  // rebroadcast) from "local user deleted this" (broadcast it).
  const remoteOriginDeletesRef = useRef<Set<string>>(new Set())

  // Offline Sync setup
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

  // Time travel setup
  const { recordEvent, isRecording, isReplaying } = useTimeTravel({
    enabled: true,
    autoRecord: true,
    maxEvents: 10000,
  })

  // Canvas setup
  const {
    canvasRef,
    containerRef,
    zoom,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    isInitialized,
  } = useCanvas({
    onObjectAdded: async (obj) => {
      const custom = obj as any
      if (!custom.id || !custom.type) return

      if (custom.synced) {
        // This object was created by WebSocketHandlers from a remote
        // object:create/canvas:sync message — give it a physics body
        // locally, but don't re-record/re-queue/re-broadcast it as if it
        // were a brand-new local action (that would echo it back out and
        // misattribute it to this user).
        if (physicsEngine) {
          addPhysicsBodyForObject(obj)
        }
        return
      }

      const data = custom.toObject ? custom.toObject() : {}
      const position = { x: custom.left || 0, y: custom.top || 0 }

      // Record event for time travel
      recordEvent('object:create', {
        objectId: custom.id,
        type: custom.type,
        data,
        position,
      })

      try {
        await queueOperation('object:create', {
          objectId: custom.id,
          type: custom.type,
          data,
          position,
          userId,
          timestamp: Date.now(),
        })
      } catch (error) {
        console.error('[CanvasRoom] Failed to queue operation:', error)
      }

      broadcastObjectCreate({
        objectId: custom.id,
        type: custom.type,
        data,
        position,
      })

      if (physicsEngine) {
        addPhysicsBodyForObject(obj)
      }
    },
    onObjectModified: (obj) => {
      const custom = obj as any
      if (!custom.id) return

      const updates = custom.toObject ? custom.toObject() : {}
      recordEvent('object:update', { objectId: custom.id, updates })
      broadcastObjectUpdate({ objectId: custom.id, updates, userId })
    },
    onObjectRemoved: (obj) => {
      const custom = obj as any
      if (!custom.id) return

      if (remoteOriginDeletesRef.current.has(custom.id)) {
        // This removal came from applying a remote object:delete message —
        // don't rebroadcast it as a new local deletion.
        remoteOriginDeletesRef.current.delete(custom.id)
        return
      }

      recordEvent('object:delete', { objectId: custom.id })
      broadcastObjectDelete({ objectId: custom.id, userId })
    },
  })

  // Physics Engine Setup
  const {
    engine: physicsEngine,
    isRunning: isPhysicsRunning,
    addBody,
    initEngine,
  } = usePhysics({
    enabled: true,
    gravity: { x: 0, y: 1 },
    autoStart: true,
    onCollision: (bodyA, bodyB) => {
      send('physics:collision', {
        objectId: bodyA.id,
        targetId: bodyB.id,
        force: 5,
      })
    },
  })

  // WebSocket Connection Setup — the single socket for this room session.
  // Object/canvas/physics handlers are registered on `client` below once the
  // canvas is ready; useCollaboration registers presence/cursor handlers on
  // the same client. (Previously useCollaboration opened its own, separate
  // socket internally, so its isConnected/send were out of sync with this one.)
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  const { client, isConnected, send, connect, disconnect } = useWebSocket({
    url: wsUrl,
    roomId,
    userId,
    username: username || 'Guest',
    autoConnect: false,
    onConnect: () => {
      if (offlineReady) {
        processQueue()
      }
    },
    onDisconnect: () => {
      console.log('[CanvasRoom] Disconnected from session engine.')
    },
    onError: (error) => {
      console.error('[CanvasRoom] WebSocket network alert:', error)
    },
  })

  // Real-time Collaboration Engine
  const { broadcastCursor, broadcastObjectCreate, broadcastObjectUpdate, broadcastObjectDelete } = useCollaboration({
    roomId,
    userId,
    username: username || 'Guest',
    client,
    send,
    isConnected,
    enabled: isConnected,
  })

  // Live canvas object/physics sync — applies incoming object:create/update/
  // delete and physics:* messages to the Fabric canvas via WebSocketHandlers.
  const canvas = useCanvasStore((state) => state.canvas)
  useEffect(() => {
    if (!client || !canvas) return

    const context: CanvasEventHandlerContext = {
      canvas,
      addObject: (obj) => useCanvasStore.getState().addObject(obj),
      removeObject: (id) => {
        remoteOriginDeletesRef.current.add(id)
        useCanvasStore.getState().removeObject(id)
      },
      updateObject: (id, props) => useCanvasStore.getState().updateObject(id, props),
    }

    const handlers = createWebSocketHandlers(context, client)

    client.on({
      onObjectCreate: (message) => handlers.handleObjectCreate(message),
      onObjectUpdate: (message) => handlers.handleObjectUpdate(message),
      onObjectDelete: (message) => handlers.handleObjectDelete(message),
      onCanvasSync: (message) => handlers.handleCanvasSync(message),
      onPhysicsEvent: (message) => handlers.handlePhysicsEvent(message),
    })
  }, [client, canvas])

  // Minimap Initialization
  useMinimap()

  // Physics Body Generator
  const addPhysicsBodyForObject = useCallback(
    (obj: FabricObject) => {
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

      return addBody(bodyConfig, obj)
    },
    [physicsEngine, addBody]
  )

  // Mouse Movement Cursor Tracking
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
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
    },
    [isConnected, broadcastCursor]
  )

  // Validate Session & Username
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    if (storedUsername) {
      setIsReady(true)
    } else {
      router.push('/')
    }
  }, [router])

  // Join Room
  useEffect(() => {
    if (isReady && username && !isInRoom) {
      joinRoom(roomId)
    }
  }, [isReady, username, roomId, joinRoom, isInRoom])

  // Manage WebSocket Connection
  useEffect(() => {
    if (isReady && username && isInRoom) {
      connect()
    }
    return () => {
      disconnect()
    }
  }, [isReady, username, isInRoom, connect, disconnect])

  // Attach Canvas Mouse Listeners
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

  // Bind Physics Engine to Canvas
  useEffect(() => {
    if (isInitialized && canvasRef.current) {
      const canvas = (canvasRef as any).current
      if (canvas) {
        initEngine(canvas)
      }
    }
  }, [isInitialized, canvasRef, initEngine])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [leaveRoom])

  // Loading State
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 text-slate-100 select-none">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <span className="absolute text-xl animate-pulse">✨</span>
        </div>
        <h2 className="text-sm font-semibold tracking-widest text-slate-300 uppercase font-mono">
          Connecting to Workspace
        </h2>
        <p className="text-xs text-slate-500 mt-2 font-mono">Initializing canvas, physics engine & sync relay...</p>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />

      {/* Main Canvas Workspace Container */}
      <div
        ref={containerRef}
        className="w-full h-full relative z-0 touch-none cursor-crosshair"
      >
        <canvas
          ref={(el) => {
            canvasElementRef.current = el
            if (canvasRef) {
              ;(canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el
            }
          }}
          className="w-full h-full block"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Real-time Remote Cursor Layer */}
      <CursorTracker canvasRef={canvasElementRef} />

      {/* TOP FLOATING UTILITY HEADER */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Section: Primary Tool Palette */}
        <div className="pointer-events-auto shadow-2xl backdrop-blur-2xl rounded-2xl bg-slate-950/80 border border-slate-800/80 p-1">
          <Toolbar />
        </div>

        {/* Center Section: Collaborator Presence Badge */}
        <div className="pointer-events-auto hidden md:flex items-center gap-2 bg-slate-950/80 backdrop-blur-2xl border border-slate-800/80 px-3.5 py-1.5 rounded-2xl shadow-2xl">
          <UserPresence />
        </div>

        {/* Right Section: Room Actions & Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Diagnostics HUD Toggle */}
          <button
            onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              isDiagnosticsOpen
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/60'
                : 'bg-slate-950/80 text-slate-300 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
            }`}
            title="Toggle Live Telemetry & Status"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">Telemetry</span>
          </button>

          {/* Physics Drawer Toggle */}
          <button
            onClick={() => setIsPhysicsOpen(!isPhysicsOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              isPhysicsOpen
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                : 'bg-slate-950/80 text-slate-300 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
            }`}
            title="Configure Canvas Physics Engine"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Physics</span>
          </button>

          {/* Export Canvas Action */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium border border-indigo-500/50 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer flex items-center gap-1.5"
            title="Export Canvas Image/Vector"
          >
            <span>📤</span>
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Room Details Overlay Toggle */}
          <button
            onClick={() => setIsRoomInfoOpen(!isRoomInfoOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border backdrop-blur-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
              isRoomInfoOpen
                ? 'bg-slate-800 text-slate-100 border-slate-700'
                : 'bg-slate-950/80 text-slate-300 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <span>📋</span>
            <span className="hidden sm:inline">{isRoomInfoOpen ? 'Hide Info' : 'Room Info'}</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE DRAWERS & OVERLAYS */}
      {/* Physics Engine Control Drawer */}
      {isPhysicsOpen && (
        <div className="absolute top-18 right-4 z-30 w-64 animate-in fade-in slide-in-from-top-3 duration-200">
          <PhysicsControls />
        </div>
      )}

      {/* Room Details Info Drawer */}
      {isRoomInfoOpen && (
        <div className="absolute top-18 right-4 z-30 animate-in fade-in slide-in-from-top-3 duration-200">
          <RoomInfo />
        </div>
      )}

      {/* Live System Diagnostics / Telemetry Panel */}
      {isDiagnosticsOpen && (
        <div className="absolute top-18 right-4 sm:right-auto sm:left-4 z-30 w-72 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 text-xs font-mono text-slate-300 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="font-semibold uppercase tracking-wider text-slate-100 text-[11px] flex items-center gap-1.5">
              <span>📡</span> Telemetry & Status
            </span>
            <span className="text-[10px] text-slate-500">{roomId.slice(0, 10)}</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Connection</span>
              <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                {isConnected ? '● WebSocket Active' : '○ Offline'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Canvas Engine</span>
              <span className={isInitialized ? 'text-emerald-400' : 'text-amber-400'}>
                {isInitialized ? '✓ Fabric Ready' : '⏳ Initializing'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Physics Simulation</span>
              <span className={isPhysicsRunning ? 'text-amber-400' : 'text-slate-500'}>
                {isPhysicsRunning ? '⚡ 60 FPS' : '⏸️ Paused'}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
              <span className="text-slate-400">Time-Travel Engine</span>
              <span className={isRecording ? 'text-rose-400' : isReplaying ? 'text-indigo-400' : 'text-slate-500'}>
                {isRecording ? '⏺️ Recording' : isReplaying ? '▶️ Replaying' : '⏹️ Idle'}
              </span>
            </div>

            {offlineStatus.pendingCount > 0 && (
              <div className="flex justify-between items-center bg-amber-950/30 border border-amber-800/40 p-2 rounded-lg text-amber-300">
                <span>Sync Queue</span>
                <span>📦 {offlineStatus.pendingCount} Pending</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL LAYER & HUD */}
      {/* Time Travel Controls (Bottom-Left Side) */}
      <div className="absolute bottom-4 left-4 z-20">
        <TimeTravelControls />
      </div>

      {/* Room Invite Card (Bottom-Left Floating) */}
      <div className="absolute bottom-16 left-4 z-10 hidden lg:block">
        <RoomInvite />
      </div>

      {/* Typing Active Indicator (Bottom-Center Floating) */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <TypingIndicator className="bg-slate-950/80 backdrop-blur-xl text-slate-200 px-3 py-1.5 rounded-full shadow-2xl border border-slate-800/80 text-xs" />
      </div>

      {/* Zoom Controls Overlay (Bottom-Center Cluster) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 shadow-2xl backdrop-blur-2xl rounded-2xl bg-slate-950/80 border border-slate-800/80 p-1">
        <ZoomControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          onFitToView={fitToView}
        />
      </div>

      {/* Canvas Radar Minimap (Bottom-Right Floating) */}
      <Minimap className="bottom-4 right-4 z-20 border border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden bg-slate-950/80 backdrop-blur-xl" />

      {/* Canvas Controls Banner (Bottom Hint Bar) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 hidden xl:flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800/60 text-[11px] font-mono text-slate-400 shadow-xl pointer-events-none">
        <span>🖱️ Scroll to zoom</span>
        <span>•</span>
        <span>Drag canvas to pan</span>
        <span>•</span>
        <span>⚡ Physics enabled</span>
        <span>•</span>
        <span>📦 Offline sync active</span>
      </div>

      {/* Export Workspace Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}