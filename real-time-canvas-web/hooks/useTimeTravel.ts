/**
 * Custom hook for time travel
 * Provides session replay and event sourcing
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useRoom } from '@/hooks/useRoom'
import { createEventStore } from '@/lib/time-travel/EventStore'
import { createTimeTravelEngine } from '@/lib/time-travel/TimeTravelEngine'
import apiClient from '@/lib/api/client'
import type { SessionEvent, TimeTravelState, ReplayOptions } from '@/types/time-travel'
import type { SyncEventRecord } from '@/types/offline'

// How often the timeline refetches the server's event log while recording
// is active, so mutations made by other clients (not just this one) show
// up without requiring a manual refresh.
const SERVER_SYNC_POLL_MS = 8000
// Debounce window after a local mutation before refetching — long enough
// for the backend to have durably recorded the corresponding sync_events
// row (it's written synchronously as part of persisting the mutation, so
// this is slack for network round-trip, not a real wait on server work).
const SERVER_SYNC_DEBOUNCE_MS = 500

interface UseTimeTravelOptions {
  enabled?: boolean
  autoRecord?: boolean
}

export function useTimeTravel(options: UseTimeTravelOptions = {}) {
  const {
    enabled = true,
    autoRecord = true,
  } = options

  const { canvas } = useCanvasStore()
  const { currentRoom } = useRoom()
  // useRoom() hands back a fresh `currentRoom` object on every fetch, even
  // when the room itself hasn't changed — depending on the object directly
  // would rebuild syncFromServer/initialize (and retrigger every effect
  // keyed on them) on every one of those refetches. The room's id is the
  // only part either function actually needs, and it stays referentially
  // stable across those refetches even when the object doesn't.
  const roomId = currentRoom?.id

  const [state, setState] = useState<TimeTravelState>({
    isRecording: false,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    events: [],
    snapshots: [],
    currentEventIndex: 0,
    isReplaying: false,
  })

  const eventStoreRef = useRef<any>(null)
  const engineRef = useRef<any>(null)
  const isRecordingRef = useRef(false)
  const syncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Pull the room's full, version-ordered event history from the backend
   * (every canvas mutation — REST or WebSocket-persisted, from any client —
   * is durably recorded there) and make it the timeline's source of truth,
   * replacing whatever this store previously had. This is what makes time
   * travel reproducible across reloads and across clients, instead of only
   * covering what this one browser tab happened to record locally.
   */
  const syncFromServer = useCallback(async () => {
    if (!roomId || !eventStoreRef.current) return

    try {
      const { data } = await apiClient.getSyncEvents(roomId)
      const records = (data || []) as SyncEventRecord[]
      const events: SessionEvent[] = records.map((record) => ({
        id: record.id,
        type: record.eventType as SessionEvent['type'],
        timestamp: Date.parse(record.createdAt),
        userId: record.userId,
        roomId: record.roomId,
        data: record.payload,
        version: record.version,
      }))

      await eventStoreRef.current.replaceEvents(events)

      setState(prev => ({
        ...prev,
        events,
        duration: events.length > 0 ? events[events.length - 1].timestamp - events[0].timestamp : 0,
      }))
    } catch (error) {
      console.error('[useTimeTravel] Failed to sync events from server:', error)
    }
  }, [roomId])

  /**
   * Initialize time travel
   */
  const initialize = useCallback(async () => {
    if (!enabled || !roomId) return

    try {
      // Create event store
      const store = await createEventStore(roomId)
      eventStoreRef.current = store

      // Create time travel engine
      const engine = await createTimeTravelEngine(roomId)
      engineRef.current = engine

      if (canvas) {
        engine.setCanvas(canvas)
      }

      // Set up callbacks
      engine.on('onEvent', (event: SessionEvent, index: number) => {
        setState(prev => ({
          ...prev,
          currentEventIndex: index,
          currentTime: event.timestamp,
        }))
      })

      engine.on('onStateChange', (state: 'playing' | 'paused' | 'stopped') => {
        setState(prev => ({
          ...prev,
          isPlaying: state === 'playing',
          isPaused: state === 'paused',
        }))
      })

      engine.on('onProgress', (progress: number) => {
        setState(prev => ({
          ...prev,
          duration: progress,
        }))
      })

      // Hydrate the timeline with the room's real history before anything
      // else, so it's populated even if autoRecord is off.
      await syncFromServer()

      // Start recording if auto-record is enabled
      if (autoRecord) {
        await startRecording()
      }

      console.log('[useTimeTravel] Initialized successfully')
    } catch (error) {
      console.error('[useTimeTravel] Failed to initialize:', error)
    }
  }, [enabled, roomId, canvas, autoRecord, syncFromServer])

  /**
   * Start recording events
   */
  const startRecording = useCallback(async () => {
    if (!eventStoreRef.current || isRecordingRef.current) return

    isRecordingRef.current = true
    setState(prev => ({ ...prev, isRecording: true }))
    console.log('[useTimeTravel] Recording started')
  }, [])

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return

    isRecordingRef.current = false
    setState(prev => ({ ...prev, isRecording: false }))
    console.log('[useTimeTravel] Recording stopped')
  }, [])

  /**
   * Note that a local mutation just happened. The mutation is already being
   * durably recorded server-side (CanvasService appends a sync_events row
   * as part of persisting it) — appending a second, client-only copy here
   * would just duplicate that row once synced, so this instead debounces a
   * refetch of the room's real event log. The `type`/`data` args are kept
   * so call sites (onObjectAdded/onObjectModified/onObjectRemoved) don't
   * need to change even though they're no longer used to build the event
   * locally.
   */
  const recordEvent = useCallback((
    _type: SessionEvent['type'],
    _data: Record<string, unknown>
  ) => {
    if (!enabled || !isRecordingRef.current) return

    if (syncDebounceRef.current) {
      clearTimeout(syncDebounceRef.current)
    }
    syncDebounceRef.current = setTimeout(() => {
      syncDebounceRef.current = null
      syncFromServer()
    }, SERVER_SYNC_DEBOUNCE_MS)
  }, [enabled, syncFromServer])

  /**
   * Play the recorded session
   */
  const play = useCallback((options: ReplayOptions = {}) => {
    if (!engineRef.current) return

    engineRef.current.play({
      speed: options.speed || 1,
      loop: options.loop || false,
      startTime: options.startTime,
      endTime: options.endTime,
    })

    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      isReplaying: true,
    }))
  }, [])

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.pause()
    setState(prev => ({ ...prev, isPaused: true }))
  }, [])

  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.stop()
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      isReplaying: false,
    }))
  }, [])

  /**
   * Seek to a specific time
   */
  const seek = useCallback((time: number) => {
    if (!engineRef.current) return
    engineRef.current.seekToTime(time)
    setState(prev => ({ ...prev, currentTime: time }))
  }, [])

  /**
   * Step forward one event
   */
  const stepForward = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.stepForward()
  }, [])

  /**
   * Step backward one event
   */
  const stepBackward = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.stepBackward()
  }, [])

  /**
   * Set playback speed
   */
  const setSpeed = useCallback((speed: number) => {
    if (!engineRef.current) return
    engineRef.current.setSpeed(speed)
    setState(prev => ({ ...prev, speed }))
  }, [])

  /**
   * Export events as JSON
   */
  const exportEvents = useCallback(async (): Promise<string> => {
    if (!eventStoreRef.current) return '{}'
    return eventStoreRef.current.exportEvents()
  }, [])

  /**
   * Import events from JSON
   */
  const importEvents = useCallback(async (data: string): Promise<void> => {
    if (!eventStoreRef.current) return
    await eventStoreRef.current.importEvents(data)
    // Refresh state
    const events = eventStoreRef.current.getAllEvents()
    const snapshots = eventStoreRef.current.getAllSnapshots()
    setState(prev => ({ ...prev, events, snapshots }))
  }, [])

  /**
   * Clear all recorded events
   */
  const clearEvents = useCallback(async () => {
    if (!eventStoreRef.current) return
    await eventStoreRef.current.clear()
    setState(prev => ({ ...prev, events: [], snapshots: [] }))
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    if (!enabled) return

    initialize()

    return () => {
      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current)
      }
      if (engineRef.current) {
        engineRef.current.dispose()
      }
      if (eventStoreRef.current) {
        eventStoreRef.current.dispose()
      }
    }
  }, [enabled, initialize])

  // Poll the server's event log while recording is active, so mutations
  // made by other clients — not just this one — reach the timeline. Local
  // mutations already get a near-immediate refresh via recordEvent's own
  // debounce; this is what makes the timeline cross-client, not just
  // cross-reload.
  useEffect(() => {
    if (!enabled || !state.isRecording) return

    const interval = setInterval(() => {
      syncFromServer()
    }, SERVER_SYNC_POLL_MS)

    return () => clearInterval(interval)
  }, [enabled, state.isRecording, syncFromServer])

  return {
    state,
    isRecording: state.isRecording,
    isReplaying: state.isReplaying,
    recordEvent,
    syncFromServer,
    startRecording,
    stopRecording,
    play,
    pause,
    stop,
    seek,
    stepForward,
    stepBackward,
    setSpeed,
    exportEvents,
    importEvents,
    clearEvents,
  }
}
