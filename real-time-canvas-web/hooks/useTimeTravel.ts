/**
 * Custom hook for time travel
 * Provides session replay and event sourcing
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useRoom'
import { createEventStore } from '@/lib/time-travel/EventStore'
import { createTimeTravelEngine } from '@/lib/time-travel/TimeTravelEngine'
import type { SessionEvent, TimeTravelState, ReplayOptions } from '@/types/time-travel'

interface UseTimeTravelOptions {
  enabled?: boolean
  autoRecord?: boolean
  maxEvents?: number
}

export function useTimeTravel(options: UseTimeTravelOptions = {}) {
  const {
    enabled = true,
    autoRecord = true,
    maxEvents = 10000,
  } = options

  const { canvas } = useCanvasStore()
  const { userId } = useAuth()
  const { currentRoom } = useRoom()

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

  /**
   * Initialize time travel
   */
  const initialize = useCallback(async () => {
    if (!enabled || !currentRoom) return

    try {
      // Create event store
      const store = await createEventStore(currentRoom.id)
      eventStoreRef.current = store

      // Create time travel engine
      const engine = await createTimeTravelEngine(currentRoom.id)
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

      // Start recording if auto-record is enabled
      if (autoRecord) {
        await startRecording()
      }

      console.log('[useTimeTravel] Initialized successfully')
    } catch (error) {
      console.error('[useTimeTravel] Failed to initialize:', error)
    }
  }, [enabled, currentRoom, canvas, autoRecord])

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
   * Record an event
   */
  const recordEvent = useCallback(async (
    type: SessionEvent['type'],
    data: Record<string, unknown>
  ) => {
    if (!enabled || !isRecordingRef.current || !eventStoreRef.current) return

    // Limit events to prevent memory issues
    const eventCount = eventStoreRef.current.getEventCount()
    if (eventCount >= maxEvents) {
      console.warn('[useTimeTravel] Max events reached, stopping recording')
      await stopRecording()
      return
    }

    try {
      const event = await eventStoreRef.current.appendEvent({
        type,
        userId: userId || 'unknown',
        roomId: currentRoom?.id || 'unknown',
        data,
      })

      setState(prev => ({
        ...prev,
        events: [...prev.events, event],
        duration: Date.now() - (prev.events[0]?.timestamp || Date.now()),
      }))
    } catch (error) {
      console.error('[useTimeTravel] Failed to record event:', error)
    }
  }, [enabled, maxEvents, stopRecording, userId, currentRoom])

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
      if (engineRef.current) {
        engineRef.current.dispose()
      }
      if (eventStoreRef.current) {
        eventStoreRef.current.dispose()
      }
    }
  }, [enabled, initialize])

  return {
    state,
    isRecording: state.isRecording,
    isReplaying: state.isReplaying,
    recordEvent,
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
