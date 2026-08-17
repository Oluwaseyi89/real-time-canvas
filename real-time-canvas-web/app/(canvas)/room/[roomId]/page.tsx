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
import { useMinimapStore } from '@/store/minimapStore'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useTimeTravel } from '@/hooks/useTimeTravel'
import { useCanvasStore } from '@/store/canvasStore'
import { useCollaborationStore } from '@/store/collaborationStore'
import { createWebSocketHandlers, type CanvasEventHandlerContext } from '@/lib/websocket/handlers'
import apiClient from '@/lib/api/client'
import { ExportModal } from '@/components/export/ExportModal'
import { ZoomControls } from '@/components/canvas/ZoomControls'
import { Toolbar } from '@/components/canvas/tools/Toolbar'
import { PhysicsControls } from '@/components/canvas/physics/PhysicsControls'
import { TimeTravelControls } from '@/components/canvas/TimeTravelControls'
import { Minimap } from '@/components/canvas/minimap/Minimap'
import { Dock } from '@/components/canvas/dock/Dock'
import { DockFlyout } from '@/components/canvas/dock/DockFlyout'
import { ColorPalette } from '@/components/canvas/dock/ColorPalette'
import { Tooltip } from '@/components/ui/Tooltip'
import type { DockPanelId } from '@/components/canvas/dock/types'
import { updateCanvasBackgroundForTheme } from '@/lib/canvas/fabricConfig'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { CursorTracker } from '@/components/collaboration/CursorTracker'
import { UserPresence } from '@/components/collaboration/UserPresence'
import { TypingIndicator } from '@/components/collaboration/TypingIndicator'
import { RoomInvite } from '@/components/room/RoomInvite'
import { RoomInfo } from '@/components/room/RoomInfo'
import { Object as FabricObject } from 'fabric'

// Stable module-level reference so it never triggers the physics-init
// effect below just because the component re-rendered — see the
// usePhysics() call for why an inline object literal here was a real bug.
const PHYSICS_GRAVITY = { x: 0, y: 1 }

export default function CanvasRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { userId: authUserId, username } = useAuth()
  // The real authenticated user id — not a per-mount random string. A
  // random per-tab id here used to mean the server (once it started
  // validating WS room membership) could never find this user in
  // room_users, since REST joins register the *real* id; every WS connect
  // failed membership validation for a room the user had genuinely joined.
  const userId = authUserId || ''
  // Read once at mount: by the time this page renders, login already
  // happened on a previous page/navigation, so localStorage is populated.
  const [token] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('authToken') || '' : ''))
  const { currentRoom, joinRoom, leaveRoom, isInRoom } = useRoom()

  // Control State
  const [isReady, setIsReady] = useState(false)
  // Every feature panel (tools, zoom, time travel, physics, presence, room
  // info, invite, diagnostics) is docked/collapsed by default and only
  // floats open when the user picks its icon in the Dock — at most one at a
  // time, so a single id is enough state. Radar is deliberately NOT part of
  // this group — see isRadarOpen below.
  const [activeDockPanel, setActiveDockPanel] = useState<DockPanelId | null>(null)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  const closeDockPanel = useCallback(() => setActiveDockPanel(null), [])
  const toggleDockPanel = useCallback((id: DockPanelId) => {
    setActiveDockPanel((prev) => (prev === id ? null : id))
  }, [])

  // Radar (minimap) stays visible for continuous monitoring while any other
  // panel opens/closes, so it's tracked independently rather than through
  // activeDockPanel — defaults to open, docked bottom-right.
  const [isRadarOpen, setIsRadarOpen] = useState(true)
  const toggleRadar = useCallback(() => setIsRadarOpen((prev) => !prev), [])

  // Minimap's own render loop (useMinimap, called both here and inside
  // <Minimap/>) gates on this store flag — keep it in sync with whether the
  // radar panel is actually mounted, so it does no rendering work while
  // hidden.
  useEffect(() => {
    useMinimapStore.getState().setVisible(isRadarOpen)
  }, [isRadarOpen])

  // Color palette (fill/outline for the shape tool) — its own right-edge
  // dock, independent of the left-side single-panel group.
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const togglePalette = useCallback(() => setIsPaletteOpen((prev) => !prev), [])

  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const lastCursorPos = useRef<{ x: number; y: number } | null>(null)
  // Object IDs currently being removed as a result of an incoming WS delete —
  // lets onObjectRemoved distinguish "remote delete applied locally" (skip
  // rebroadcast) from "local user deleted this" (broadcast it).
  const remoteOriginDeletesRef = useRef<Set<string>>(new Set())
  // Tracks in-progress physics drags: while an object with a live body is
  // being dragged, the body is frozen and follows the pointer (see
  // onObjectMoving below) instead of fighting the user's manual move; this
  // also doubles as the last-sample velocity estimate used to fling the
  // body on release (see onObjectModified).
  const dragTrackingRef = useRef<Map<string, { x: number; y: number; t: number; vx: number; vy: number }>>(new Map())
  // Each client runs its own independent Matter engine — there's no
  // server-side physics authority — so cross-client consistency works by
  // replaying the same commands (toggle on/off, set gravity, throw/attract/
  // repel) on every client rather than broadcasting continuous positions.
  // These flags distinguish "this client changed physicsEnabled/gravity
  // locally, broadcast it" from "this change just arrived over the wire,
  // apply it locally but don't echo it back out" — without them, every
  // toggle would ping-pong between clients forever.
  const remotePhysicsEnabledRef = useRef(false)
  const remotePhysicsGravityRef = useRef(false)
  const lastAttractRepelBroadcastRef = useRef(0)

  // Offline Sync setup
  const {
    queueOperation,
    processQueue,
    fetchMissedEvents,
    acknowledgeSyncVersion,
    status: offlineStatus,
    isReady: offlineReady,
  } = useOfflineSync({
    roomId,
    userId,
    enabled: true,
  })

  // Missed-sync catch-up: on every (re)connect, fetch sync events recorded
  // on the server while this client was offline/disconnected (or simply
  // never connected before) and replay them onto the canvas via the same
  // handlers WebSocketHandlers uses for live object:create/update/delete
  // messages — those are idempotent (handleObjectCreate skips if the id
  // already exists, handleObjectDelete/Update no-op if it doesn't), so
  // replaying events this client already has is harmless.
  const applyMissedSyncEvents = useCallback(async () => {
    if (!offlineReady) return

    try {
      // Canvas isn't mounted yet (e.g. this fired right after connect, before
      // useCanvas's init effect ran) — bail out WITHOUT acknowledging, so
      // this retries on the next successful catch-up instead of losing
      // anything silently.
      const canvas = useCanvasStore.getState().canvas
      if (!canvas) return

      const context: CanvasEventHandlerContext = {
        canvas,
        addObject: (obj) => useCanvasStore.getState().addObject(obj),
        removeObject: (id) => {
          remoteOriginDeletesRef.current.add(id)
          useCanvasStore.getState().removeObject(id)
        },
        updateObject: (id, props) => useCanvasStore.getState().updateObject(id, props),
      }
      // `client` goes unused by handleObjectCreate/Update/Delete/CanvasSync —
      // WebSocketHandlers only stores it for methods this replay path
      // doesn't call — so a real WebSocketClient isn't needed here.
      const replayHandlers = createWebSocketHandlers(context, null as any)

      // Full-state hydration from the room's current object list. This is
      // NOT redundant with the missed-events replay below: this client's
      // "last acknowledged" sync version is persisted in IndexedDB, keyed
      // by roomId, so it survives a page refresh — but the in-memory Fabric
      // canvas does NOT survive a refresh; it's rebuilt empty. A client that
      // already caught up before refreshing would ask for events "since"
      // its old version, get zero back, and the canvas would stay blank
      // forever even though every object is safely in Postgres. Fetching
      // the room's actual current objects and replaying them via
      // handleCanvasSync (which skips anything already on the canvas) fixes
      // that regardless of what this client's acknowledged version says —
      // and is cheap/safe to redo on every reconnect, not just the first.
      try {
        const { data } = await apiClient.getObjects(roomId)
        const objects = (data || []) as Array<{ id: string; type: string; data: Record<string, unknown> }>
        if (objects.length > 0) {
          replayHandlers.handleCanvasSync({
            id: 'hydration',
            type: 'canvas:sync',
            roomId,
            userId: '',
            timestamp: Date.now(),
            payload: { objects, version: 0, timestamp: Date.now() },
          } as any)
        }
      } catch (error) {
        console.error('[CanvasRoom] Failed to hydrate canvas from server:', error)
      }

      const events = await fetchMissedEvents()
      if (events.length === 0) return

      for (const event of events) {
        const message = {
          id: event.id,
          type: event.eventType,
          roomId: event.roomId,
          userId: event.userId,
          timestamp: new Date(event.createdAt).getTime(),
          payload: event.payload,
        } as any

        switch (event.eventType) {
          case 'object:create':
            replayHandlers.handleObjectCreate(message)
            break
          case 'object:update':
            replayHandlers.handleObjectUpdate(message)
            break
          case 'object:delete':
            replayHandlers.handleObjectDelete(message)
            break
          default:
            console.debug('[CanvasRoom] Skipping missed sync event of unreplayed type:', event.eventType)
        }
      }

      const maxVersion = events.reduce((max, e) => Math.max(max, e.version), 0)
      await acknowledgeSyncVersion(maxVersion)

      console.log(`[CanvasRoom] Applied ${events.length} missed sync event(s)`)
    } catch (error) {
      console.error('[CanvasRoom] Failed to apply missed sync events:', error)
    }
  }, [offlineReady, fetchMissedEvents, acknowledgeSyncVersion, roomId])

  // Time travel setup
  const { recordEvent, isRecording, isReplaying } = useTimeTravel({
    enabled: true,
    autoRecord: true,
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
        if (physicsEngine && useCanvasStore.getState().physicsEnabled) {
          addPhysicsBodyForObject(obj)
        }
        return
      }

      // Fabric's toObject() only serializes properties it natively knows
      // about (left, top, fill, src, ...) — our own custom bag (metadata,
      // createdBy; see attachCustomProps in objectFactory.ts) has to be
      // requested explicitly or it silently never reaches the broadcast/
      // persisted payload, even though it's a real property on the object.
      const data = custom.toObject ? custom.toObject(['metadata', 'createdBy']) : {}
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

      // Static by default — this is a design canvas first, and every new
      // object used to get a live gravity-affected physics body the
      // instant it was placed, so it started drifting/falling before you
      // could even select it. Objects only join the simulation once the
      // user explicitly opts in via the Physics panel's toggle.
      if (physicsEngine && useCanvasStore.getState().physicsEnabled) {
        addPhysicsBodyForObject(obj)
      }
    },
    onObjectModified: (obj) => {
      const custom = obj as any
      if (!custom.id) return

      // Drag-release throw: if this modification ended a physics drag (see
      // onObjectMoving), the body was frozen and following the pointer —
      // hand it back to the simulation with the velocity the user was
      // dragging at, so releasing mid-motion flings it instead of just
      // dropping it dead where the pointer let go.
      const track = dragTrackingRef.current.get(custom.id)
      dragTrackingRef.current.delete(custom.id)
      if (track && physicsEngine && useCanvasStore.getState().physicsEnabled) {
        // Gravity (1G) settles into roughly a ~100px/s terminal fall in this
        // world — 40px/frame (~2400px/s) launched objects off-screen almost
        // instantly. This keeps a fast flick fast but still on-screen.
        const MAX_THROW_SPEED = 10
        const speed = Math.hypot(track.vx, track.vy)
        const scale = speed > MAX_THROW_SPEED ? MAX_THROW_SPEED / speed : 1
        const thrownVelocity = { x: track.vx * scale, y: track.vy * scale }
        throwBody(custom.id, { velocity: thrownVelocity })
        // Replay the same throw on every other client's own simulation —
        // there's no server-side physics authority, so this is how the
        // fling stays consistent across clients instead of only happening
        // for the person who dragged it.
        sendRef.current?.('physics:throw', {
          objectId: custom.id,
          type: 'throw',
          velocity: thrownVelocity,
        })
      }

      // See the matching comment in onObjectAdded above — same gap applies
      // to modify-broadcasts, not just the initial create.
      const updates = custom.toObject ? custom.toObject(['metadata', 'createdBy']) : {}
      recordEvent('object:update', { objectId: custom.id, updates })
      broadcastObjectUpdate({ objectId: custom.id, updates, userId })
    },
    onObjectMoving: (obj) => {
      const custom = obj as any
      if (!custom.id || !physicsEngine || !useCanvasStore.getState().physicsEnabled) return

      const now = performance.now()
      const centerX = (obj.left || 0) + (obj.width || 50) / 2
      const centerY = (obj.top || 0) + (obj.height || 50) / 2
      const prev = dragTrackingRef.current.get(custom.id)

      if (!prev) {
        // First move of this drag — freeze the body so the simulation
        // doesn't fight the user, then let it start following the pointer.
        setBodyStatic(custom.id, true)
        dragTrackingRef.current.set(custom.id, { x: centerX, y: centerY, t: now, vx: 0, vy: 0 })
      } else {
        const dt = now - prev.t
        // dt guard avoids a div-by-near-zero spike from back-to-back move
        // events; velocity is expressed in Matter's per-frame units (~1/60s).
        const vx = dt > 1 ? ((centerX - prev.x) / dt) * (1000 / 60) : prev.vx
        const vy = dt > 1 ? ((centerY - prev.y) / dt) * (1000 / 60) : prev.vy
        dragTrackingRef.current.set(custom.id, { x: centerX, y: centerY, t: now, vx, vy })
      }

      setBodyPosition(custom.id, { x: centerX, y: centerY })
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

  // `send` isn't available until useWebSocket() below, and onCollision needs
  // to stay referentially stable regardless — usePhysics()'s initEngine is a
  // useCallback keyed on its onCollision option, and the physics-init effect
  // further down depends on initEngine. A fresh arrow function here every
  // render meant that effect fired every render too, tearing down and
  // rebuilding the physics engine (and the canvas resources it touches)
  // continuously instead of once — this ref lets onCollision stay stable
  // while still always calling the latest send.
  const sendRef = useRef<typeof send | null>(null)
  const handleCollision = useCallback((bodyA: any, bodyB: any) => {
    sendRef.current?.('physics:collision', {
      objectId: bodyA.id,
      targetId: bodyB.id,
      force: 5,
    })
  }, [])

  // Physics Engine Setup
  const {
    engine: physicsEngine,
    isRunning: isPhysicsRunning,
    isPaused: isPhysicsPaused,
    addBody,
    removeBody,
    initEngine,
    start: startPhysics,
    stop: stopPhysics,
    pause: pausePhysics,
    resume: resumePhysics,
    setGravity: setPhysicsGravityValue,
    setTimeScale: setPhysicsTimeScale,
    throwBody,
    attractBody,
    repelBody,
    setBodyStatic,
    setBodyPosition,
  } = usePhysics({
    // usePhysics() never actually reads this option (dead prop on the hook
    // itself) — the real, user-facing on/off switch is the canvas store's
    // physicsEnabled, gating whether objects get bodies at all (see
    // onObjectAdded and the sync effect below). autoStart just keeps the
    // simulation loop ticking in the background so it's ready the instant
    // physicsEnabled flips true; with no bodies attached while it's false,
    // that loop has nothing to simulate and costs nothing to run.
    enabled: true,
    gravity: PHYSICS_GRAVITY,
    autoStart: true,
    onCollision: handleCollision,
  })

  // Publishes this page's real, canvas-attached physics actions/state to the
  // shared store so PhysicsControls (and anything else rendered outside this
  // component) can drive the actual engine instead of an uninitialized one
  // of its own — see the store's PhysicsController type for why.
  useEffect(() => {
    useCanvasStore.getState().setPhysicsController({
      isRunning: isPhysicsRunning,
      isPaused: isPhysicsPaused,
      start: startPhysics,
      stop: stopPhysics,
      pause: pausePhysics,
      resume: resumePhysics,
      setGravity: setPhysicsGravityValue,
      setTimeScale: setPhysicsTimeScale,
      throwBody,
      attractBody,
      repelBody,
    })
    return () => useCanvasStore.getState().setPhysicsController(null)
  }, [
    isPhysicsRunning,
    isPhysicsPaused,
    startPhysics,
    stopPhysics,
    pausePhysics,
    resumePhysics,
    setPhysicsGravityValue,
    setPhysicsTimeScale,
    throwBody,
    attractBody,
    repelBody,
  ])

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
    token,
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

  // Keeps handleCollision (defined above, before `send` exists) calling the
  // current send without itself needing to depend on it.
  useEffect(() => {
    sendRef.current = send
  }, [send])

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
  const physicsEnabled = useCanvasStore((state) => state.physicsEnabled)
  const physicsGravity = useCanvasStore((state) => state.physicsGravity)
  const userCount = useCollaborationStore((state) => state.userCount)
  const { theme } = useTheme()

  // Fabric paints its own background directly onto the canvas bitmap, so it
  // doesn't pick up the page's `dark:` CSS variant on its own — repaint it
  // manually whenever the user toggles light/dark.
  useEffect(() => {
    if (!canvas) return
    updateCanvasBackgroundForTheme(canvas, theme)
  }, [canvas, theme])

  // Fetch-missed-events catch-up. Deliberately NOT done from useWebSocket's
  // onConnect callback: that fires the instant the socket opens, which can
  // race ahead of both useOfflineSync's async IndexedDB init (offlineReady
  // still false) and useCanvas's own init effect (canvas still null) —
  // either gap meant applyMissedSyncEvents bailed out silently. Reacting to
  // all three readiness signals here instead fires once as soon as they're
  // ALL true regardless of which settles last, and appliedForConnectionRef
  // resets on disconnect so the next reconnect (not just the first-ever
  // connect) fetches again.
  const appliedForConnectionRef = useRef(false)
  useEffect(() => {
    if (isConnected && offlineReady && canvas) {
      if (!appliedForConnectionRef.current) {
        appliedForConnectionRef.current = true
        applyMissedSyncEvents()
      }
    } else {
      appliedForConnectionRef.current = false
    }
  }, [isConnected, offlineReady, canvas, applyMissedSyncEvents])

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
      // The hub echoes every broadcast back to the sender too (it doesn't
      // exclude the originating connection) — this component already
      // applied its own local action directly (not via this handler)
      // before broadcasting, so re-applying an echo of its own message
      // would double up (throwBody is idempotent, but attractBody/repelBody
      // use Body.applyForce, which is cumulative — a self-echo would add a
      // second force impulse on top of the one already applied locally).
      // Comparing message.userId against this client's own id makes every
      // physics:* handler below a no-op for its own echoes.
      //
      // throw/attract/repel are replayed on THIS client's own engine (each
      // client runs an independent Matter simulation — there's no
      // server-side physics authority — so the receiving client needs the
      // actual command applied, not a manual position animation).
      // 'collision' has no local engine action to replay, so it still falls
      // through to the legacy visual-nudge handler.
      onPhysicsEvent: (message) => {
        if (message.userId === userId) return
        const { type, objectId, velocity, position, strength, radius } = message.payload
        const controller = useCanvasStore.getState().physicsController
        if (type === 'throw' && velocity && controller) {
          controller.throwBody(objectId, { velocity })
        } else if (
          (type === 'attract' || type === 'repel') &&
          position &&
          strength !== undefined &&
          radius !== undefined &&
          controller
        ) {
          const config = { position, strength, radius, type }
          if (type === 'attract') controller.attractBody(objectId, config)
          else controller.repelBody(objectId, config)
        } else {
          handlers.handlePhysicsEvent(message)
        }
      },
      onPhysicsEnabled: (message) => {
        if (message.userId === userId) return
        remotePhysicsEnabledRef.current = true
        useCanvasStore.getState().setPhysicsEnabled(message.payload.enabled)
      },
      onPhysicsGravity: (message) => {
        if (message.userId === userId) return
        remotePhysicsGravityRef.current = true
        useCanvasStore.getState().setPhysicsGravity(message.payload.gravity)
        useCanvasStore.getState().physicsController?.setGravity(message.payload.gravity)
      },
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

  // Syncs physics bodies to the room-wide physicsEnabled toggle (flipped by
  // PhysicsControls' own "Active/Disabled" button, which only starts/stops
  // the simulation loop — it has no idea about individual objects). Runs as
  // an effect rather than inside a click handler so it stays correct no
  // matter what flips the flag. Turning physics on gives every object
  // currently on the canvas a body anchored right where it already sits —
  // nothing teleports, only gravity applies from that point forward.
  // Turning it off removes those bodies so objects freeze exactly where
  // they are and go back to being plain, fully drag/resize-able Fabric
  // objects with nothing fighting the user's own manipulation.
  const prevPhysicsEnabledRef = useRef(physicsEnabled)
  useEffect(() => {
    if (prevPhysicsEnabledRef.current === physicsEnabled) return
    prevPhysicsEnabledRef.current = physicsEnabled

    // Broadcast this toggle so other clients' canvases attach/detach bodies
    // too — unless this change just arrived FROM another client, in which
    // case echoing it back out would ping-pong forever.
    if (remotePhysicsEnabledRef.current) {
      remotePhysicsEnabledRef.current = false
    } else {
      sendRef.current?.('physics:enabled', { enabled: physicsEnabled })
    }

    if (!physicsEngine) return

    const objects = useCanvasStore.getState().objects
    if (physicsEnabled) {
      objects.forEach((obj) => addPhysicsBodyForObject(obj))
    } else {
      objects.forEach((obj) => {
        const id = (obj as any).id
        if (id) removeBody(id)
      })
    }
  }, [physicsEnabled, physicsEngine, addPhysicsBodyForObject, removeBody])

  // Broadcasts local gravity changes (Earth/Zero-G/Inverted presets or the
  // manual sliders in PhysicsControls) so every client's simulation applies
  // the same gravity — same remote-origin guard as the toggle above.
  const prevPhysicsGravityRef = useRef(physicsGravity)
  useEffect(() => {
    const prev = prevPhysicsGravityRef.current
    if (prev.x === physicsGravity.x && prev.y === physicsGravity.y) return
    prevPhysicsGravityRef.current = physicsGravity

    if (remotePhysicsGravityRef.current) {
      remotePhysicsGravityRef.current = false
      return
    }
    sendRef.current?.('physics:gravity', { gravity: physicsGravity })
  }, [physicsGravity])

  // Attract/Repel keybinds — hold "A" to pull the selected object toward
  // the canvas center, hold "R" to push it away, for as long as the key is
  // held. Only active while physics is on; targets whatever Fabric reports
  // as the active object at each animation frame, so switching selection
  // mid-hold just retargets rather than requiring a fresh keypress.
  useEffect(() => {
    if (!physicsEnabled || !physicsEngine) return

    let activeKey: 'a' | 'r' | null = null
    let frameId: number | null = null

    const tick = () => {
      const active = useCanvasStore.getState().canvas?.getActiveObject() as any
      if (active?.id && activeKey) {
        const { width, height } = useCanvasStore.getState().viewport
        const config = {
          position: { x: width / 2, y: height / 2 },
          // PhysicsEngine's attract/repel force is inverse-square
          // (strength * mass / distance²), unlike Matter's own gravity
          // (mass * gravity * scale, no distance term) — at a typical
          // ~300-500px on-canvas distance, a strength comparable to
          // gravity's constant would be imperceptible. This value keeps
          // the per-frame force in roughly the same visible range gravity
          // produces (~0.01) at those distances.
          strength: 120,
          radius: 3000,
          type: activeKey === 'a' ? ('attract' as const) : ('repel' as const),
        }
        if (activeKey === 'a') attractBody(active.id, config)
        else repelBody(active.id, config)

        // Throttled — this tick runs every animation frame while the key
        // is held, and broadcasting at 60Hz would flood the socket for no
        // real benefit (other clients just need to feel the same pull
        // often enough to look continuous, not every single frame).
        const now = performance.now()
        if (now - lastAttractRepelBroadcastRef.current > 100) {
          lastAttractRepelBroadcastRef.current = now
          sendRef.current?.(activeKey === 'a' ? 'physics:attract' : 'physics:repel', {
            objectId: active.id,
            ...config,
          })
        }
      }
      frameId = requestAnimationFrame(tick)
    }

    const isTypingTarget = (el: EventTarget | null) => {
      const target = el as HTMLElement | null
      return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key !== 'a' && key !== 'r') return
      activeKey = key
      if (frameId === null) frameId = requestAnimationFrame(tick)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== activeKey) return
      activeKey = null
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [physicsEnabled, physicsEngine, attractBody, repelBody])

  // Mouse Movement Cursor Tracking. Broadcasts in *scene* coordinates (the
  // same plane as object.left/top, unaffected by zoom/pan) rather than raw
  // canvas-pixel-buffer coordinates — the minimap positions dots against
  // object bounding rects, which are also scene-space, so a receiver's
  // dot/cursor render only lines up with real object positions if the
  // broadcast is in that same space. A raw-pixel broadcast only happened to
  // look right at zoom=1/pan={0,0}; any pan or zoom made it drift.
  // CursorTracker converts back to each viewer's own screen space using
  // their own viewportTransform, since two clients can be panned/zoomed
  // differently.
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const fabricCanvas = useCanvasStore.getState().canvas
      if (!fabricCanvas || !isConnected) return

      const scenePoint = fabricCanvas.getScenePoint(e)
      const x = scenePoint.x
      const y = scenePoint.y

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
    if (isReady && username && isInRoom && token) {
      connect()
    }
    return () => {
      disconnect()
    }
  }, [isReady, username, isInRoom, token, connect, disconnect])

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

  // Bind Physics Engine to Canvas. PhysicsEngine.setCanvas() expects the
  // Fabric Canvas instance (it calls canvas.renderAll() every simulation
  // frame) — canvasRef.current is the raw <canvas> DOM element, which has
  // no renderAll() method. Passing it silently broke the engine's own
  // render loop: the first frame's `this.canvas.renderAll()` threw inside
  // the requestAnimationFrame callback, which aborted before it could
  // reschedule itself, so the loop died after one frame. Matter still
  // simulated bodies and updated linked Fabric objects' left/top/angle in
  // memory (via the engine's own 'afterUpdate' listener), but nothing ever
  // repainted them — so any *passive* physics motion (gravity settling,
  // attract/repel) was invisible unless some unrelated interaction (drag,
  // zoom, pan) happened to trigger Fabric's own repaint in the meantime.
  useEffect(() => {
    if (isInitialized && canvas) {
      initEngine(canvas)
    }
  }, [isInitialized, canvas, initEngine])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [leaveRoom])

  // Loading State
  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <span className="absolute text-xl animate-pulse">✨</span>
        </div>
        <h2 className="text-sm font-semibold tracking-widest text-slate-700 dark:text-slate-300 uppercase font-mono">
          Connecting to Workspace
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 font-mono">Initializing canvas, physics engine & sync relay...</p>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans select-none">
      {/* Dynamic Background Mesh Grid */}
      <div className="canvas-dot-grid absolute inset-0 opacity-60 pointer-events-none z-0" />

      {/* Main Canvas Workspace Container */}
      <div
        ref={containerRef}
        data-canvas-root
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

      {/* Ephemeral typing notice — only ever appears while someone is
          actually typing, so it doesn't count as persistent chrome. */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <TypingIndicator className="bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-full shadow-2xl border border-slate-200/80 dark:border-slate-800/80 text-xs" />
      </div>

      {/* FEATURE DOCK — every panel below (tools, radar, zoom, time travel,
          physics, presence, room info, invite, diagnostics) is docked and
          collapsed until its icon is clicked; at most one floats open at a
          time, positioned in the flyout slot beside the dock. */}
      <Dock
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40"
        activePanel={activeDockPanel}
        onTogglePanel={toggleDockPanel}
        onOpenExport={() => setIsExportModalOpen(true)}
        isConnected={isConnected}
        physicsEnabled={physicsEnabled}
        userCount={userCount}
        isRadarOpen={isRadarOpen}
        onToggleRadar={toggleRadar}
      />

      {/* Radar: independent of the single-panel flyout below — stays open
          for monitoring while any other panel is in use, default-docked to
          the bottom-right corner rather than beside the dock. */}
      <DockFlyout
        isOpen={isRadarOpen}
        onClose={toggleRadar}
        cornerClassName="bottom-4 right-4"
        closeOnOutsideClick={false}
        closeOnEscape={false}
      >
        <Minimap />
      </DockFlyout>

      {/* Color palette: a single-icon dock on the right edge (mirroring the
          left dock), for the shape tool's fill/outline colors. */}
      <Tooltip label={isPaletteOpen ? 'Hide colors' : 'Show colors'} side="right">
        <button
          type="button"
          data-dock-root
          onClick={togglePalette}
          className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all active:scale-95 flex items-center justify-center ${
            isPaletteOpen
              ? 'bg-indigo-600 text-white border-indigo-500/60 shadow-indigo-600/40'
              : 'glass-panel text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border-slate-300/60 dark:border-slate-700/60'
          }`}
          aria-label={isPaletteOpen ? 'Hide colors' : 'Show colors'}
          aria-pressed={isPaletteOpen}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h10a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5M7 9h.01"
            />
          </svg>
        </button>
      </Tooltip>

      <DockFlyout
        isOpen={isPaletteOpen}
        onClose={togglePalette}
        cornerClassName="right-20 top-4"
      >
        <ColorPalette />
      </DockFlyout>

      <DockFlyout
        isOpen={activeDockPanel !== null}
        onClose={closeDockPanel}
      >
        {activeDockPanel === 'tools' && <Toolbar roomId={roomId} />}

        {activeDockPanel === 'zoom' && (
          <ZoomControls
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetView}
            onFitToView={fitToView}
          />
        )}

        {activeDockPanel === 'timeTravel' && <TimeTravelControls onClose={closeDockPanel} />}

        {activeDockPanel === 'physics' && <PhysicsControls />}

        {activeDockPanel === 'presence' && <UserPresence />}

        {activeDockPanel === 'roomInfo' && <RoomInfo />}

        {activeDockPanel === 'invite' && <RoomInvite />}

        {activeDockPanel === 'diagnostics' && (
          <div className="w-72 bg-slate-50/90 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-2xl backdrop-blur-xl space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
              <span className="font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 text-[11px] flex items-center gap-1.5">
                <span>📡</span> Telemetry & Status
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-500">{roomId.slice(0, 10)}</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center bg-slate-100/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Connection</span>
                <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                  {isConnected ? '● WebSocket Active' : '○ Offline'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-100/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Canvas Engine</span>
                <span className={isInitialized ? 'text-emerald-400' : 'text-amber-400'}>
                  {isInitialized ? '✓ Fabric Ready' : '⏳ Initializing'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-100/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Physics Simulation</span>
                <span className={physicsEnabled && isPhysicsRunning ? 'text-amber-400' : 'text-slate-500 dark:text-slate-500'}>
                  {physicsEnabled && isPhysicsRunning ? '⚡ 60 FPS' : '⏸️ Paused'}
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-100/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-slate-600 dark:text-slate-400">Time-Travel Engine</span>
                <span className={isRecording ? 'text-rose-400' : isReplaying ? 'text-indigo-400' : 'text-slate-500 dark:text-slate-500'}>
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
      </DockFlyout>

      {/* Export Workspace Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}