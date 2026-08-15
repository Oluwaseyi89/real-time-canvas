/**
 * Time travel engine for session replay
 * Manages playback of events and state reconstruction
 */

import { Canvas, Object as FabricObject } from 'fabric'
import type { SessionEvent, CanvasSnapshot, ReplayOptions } from '@/types/time-travel'
import { EventStoreImpl, createEventStore } from './EventStore'
import { createWebSocketHandlers, WebSocketHandlers, type CanvasEventHandlerContext } from '@/lib/websocket/handlers'

export class TimeTravelEngine {
  private eventStore: EventStoreImpl
  private canvas: Canvas | null = null
  // Reconstructs objects from event payloads via the same type-to-Fabric-
  // object switch WebSocketHandlers already uses for live object:create
  // messages and missed-sync-event catch-up — reusing it here means replay
  // renders real objects (including audio/image, via ObjectFactory) instead
  // of duplicating that switch statement a third time.
  private wsHandlers: WebSocketHandlers | null = null
  private isPlaying: boolean = false
  private isPaused: boolean = false
  private currentEventIndex: number = 0
  private speed: number = 1
  private loop: boolean = false
  private animationFrame: number | null = null
  private callbacks: {
    onEvent?: (event: SessionEvent, index: number) => void
    onStateChange?: (state: 'playing' | 'paused' | 'stopped') => void
    onProgress?: (progress: number) => void
    onComplete?: () => void
  } = {}

  constructor(eventStore: EventStoreImpl) {
    this.eventStore = eventStore
  }

  /**
   * Set the canvas for replay
   */
  setCanvas(canvas: Canvas): void {
    this.canvas = canvas

    const context: CanvasEventHandlerContext = {
      canvas,
      addObject: (obj) => {
        canvas.add(obj)
        canvas.requestRenderAll()
      },
      removeObject: (id) => {
        const obj = canvas.getObjects().find((o: any) => o.id === id)
        if (obj) {
          canvas.remove(obj)
          canvas.requestRenderAll()
        }
      },
      updateObject: (id, props) => {
        const obj = canvas.getObjects().find((o: any) => o.id === id)
        if (obj) {
          obj.set(props as Partial<FabricObject>)
          obj.setCoords()
          canvas.requestRenderAll()
        }
      },
    }
    // `client` goes unused by handleObjectCreate/Update/Delete — same as
    // the missed-sync-events replay path in the room page — so a real
    // WebSocketClient isn't needed here either.
    this.wsHandlers = createWebSocketHandlers(context, null as any)
  }

  /**
   * Register callbacks
   */
  on<K extends keyof typeof this.callbacks>(
    event: K,
    callback: NonNullable<(typeof this.callbacks)[K]>
  ): void {
    this.callbacks[event] = callback
  }

  /**
   * Start replay from the beginning
   */
  play(options: ReplayOptions = {}): void {
    if (this.isPlaying && !this.isPaused) return

    const { speed = 1, loop = false, startTime, endTime } = options
    this.speed = speed
    this.loop = loop

    const events = this.eventStore.getEvents(startTime, endTime)
    if (events.length === 0) {
      console.warn('[TimeTravelEngine] No events to replay')
      return
    }

    // If paused, resume
    if (this.isPaused) {
      this.isPaused = false
      this.callbacks.onStateChange?.('playing')
      return
    }

    // Start from beginning or from current position
    if (this.currentEventIndex >= events.length) {
      this.currentEventIndex = 0
    }

    this.isPlaying = true
    this.isPaused = false
    this.callbacks.onStateChange?.('playing')

    // Start replay loop
    this.replayLoop()
  }

  /**
   * Pause replay
   */
  pause(): void {
    if (!this.isPlaying || this.isPaused) return

    this.isPaused = true
    this.callbacks.onStateChange?.('paused')

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  /**
   * Stop replay
   */
  stop(): void {
    this.isPlaying = false
    this.isPaused = false
    this.currentEventIndex = 0

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    this.callbacks.onStateChange?.('stopped')
  }

  /**
   * Seek to a specific event index
   */
  seek(eventIndex: number): void {
    const events = this.eventStore.getAllEvents()
    if (eventIndex < 0 || eventIndex >= events.length) {
      console.warn('[TimeTravelEngine] Invalid event index')
      return
    }

    this.currentEventIndex = eventIndex
    this.applyEvent(events[eventIndex])
  }

  /**
   * Seek to a specific time
   */
  seekToTime(time: number): void {
    const events = this.eventStore.getEvents()
    let targetIndex = events.length - 1

    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].timestamp <= time) {
        targetIndex = i
        break
      }
    }

    this.seek(targetIndex)
  }

  /**
   * Step forward one event. Applies the event at the current index first,
   * then advances — matching replayLoop's own apply-then-increment order —
   * so the very first call from a fresh/rewound state (currentEventIndex
   * still 0) actually applies event 0 instead of skipping straight to
   * event 1. Incrementing before applying (the previous order here) meant
   * the first event in any room's history could never be replayed via
   * step-forward, only via play() or seek(0).
   */
  stepForward(): void {
    const events = this.eventStore.getAllEvents()
    if (this.currentEventIndex < events.length) {
      this.applyEvent(events[this.currentEventIndex])
      this.callbacks.onEvent?.(events[this.currentEventIndex], this.currentEventIndex)
      this.currentEventIndex++
    }
  }

  /**
   * Step backward one event
   */
  stepBackward(): void {
    if (this.currentEventIndex > 0) {
      this.currentEventIndex--
      const events = this.eventStore.getAllEvents()
      this.applyEvent(events[this.currentEventIndex])
      this.callbacks.onEvent?.(events[this.currentEventIndex], this.currentEventIndex)
    }
  }

  /**
   * Set playback speed
   */
  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10, speed))
  }

  /**
   * Get current state
   */
  getState(): {
    isPlaying: boolean
    isPaused: boolean
    currentEventIndex: number
    totalEvents: number
    progress: number
    speed: number
  } {
    const totalEvents = this.eventStore.getEventCount()
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentEventIndex: this.currentEventIndex,
      totalEvents,
      progress: totalEvents > 0 ? (this.currentEventIndex / totalEvents) * 100 : 0,
      speed: this.speed,
    }
  }

  /**
   * Replay loop
   */
  private replayLoop(): void {
    if (!this.isPlaying || this.isPaused) return

    const events = this.eventStore.getAllEvents()

    if (this.currentEventIndex >= events.length) {
      if (this.loop) {
        this.currentEventIndex = 0
      } else {
        this.stop()
        this.callbacks.onComplete?.()
        return
      }
    }

    // Apply current event
    const event = events[this.currentEventIndex]
    this.applyEvent(event)
    this.callbacks.onEvent?.(event, this.currentEventIndex)

    // Update progress
    const progress = (this.currentEventIndex / events.length) * 100
    this.callbacks.onProgress?.(progress)

    // Advance to next event based on speed
    this.currentEventIndex++

    // Schedule next event
    const delay = 1000 / this.speed // Base delay
    this.animationFrame = setTimeout(() => {
      this.replayLoop()
    }, delay) as unknown as number
  }

  /**
   * Apply an event to the canvas
   */
  private applyEvent(event: SessionEvent): void {
    if (!this.canvas) {
      console.warn('[TimeTravelEngine] Canvas not set')
      return
    }

    try {
      switch (event.type) {
        case 'object:create':
          this.applyObjectCreate(event.data)
          break
        case 'object:update':
          this.applyObjectUpdate(event.data)
          break
        case 'object:delete':
          this.applyObjectDelete(event.data)
          break
        case 'object:move':
          this.applyObjectMove(event.data)
          break
        case 'canvas:clear':
          this.applyCanvasClear()
          break
        case 'canvas:sync':
          this.applyCanvasSync(event.data)
          break
        default:
          // Ignore other event types
          break
      }
    } catch (error) {
      console.error('[TimeTravelEngine] Failed to apply event:', error)
    }
  }

  /**
   * Apply object creation — reconstructs the object via WebSocketHandlers,
   * same as a live object:create message or a missed-sync-event replay.
   * Payload shape matches ObjectCreatePayload: { objectId, type, data, position }.
   */
  private applyObjectCreate(data: Record<string, unknown>): void {
    if (!this.wsHandlers) {
      console.warn('[TimeTravelEngine] Canvas not set')
      return
    }
    this.wsHandlers.handleObjectCreate({ payload: data } as any)
  }

  /**
   * Apply object update — payload shape matches ObjectUpdatePayload:
   * { objectId, updates }.
   */
  private applyObjectUpdate(data: Record<string, unknown>): void {
    if (!this.wsHandlers) {
      console.warn('[TimeTravelEngine] Canvas not set')
      return
    }
    this.wsHandlers.handleObjectUpdate({ payload: data } as any)
  }

  /**
   * Apply object deletion — payload shape matches ObjectDeletePayload:
   * { objectId }.
   */
  private applyObjectDelete(data: Record<string, unknown>): void {
    if (!this.wsHandlers) {
      console.warn('[TimeTravelEngine] Canvas not set')
      return
    }
    this.wsHandlers.handleObjectDelete({ payload: data } as any)
  }

  /**
   * Apply object move
   */
  private applyObjectMove(data: Record<string, unknown>): void {
    const { objectId, position } = data
    const obj = this.canvas?.getObjects().find((o: any) => o.id === objectId)
    if (obj) {
      obj.set(position as Partial<FabricObject>)
      this.canvas?.requestRenderAll()
    }
  }

  /**
   * Apply canvas clear
   */
  private applyCanvasClear(): void {
    this.canvas?.clear()
    this.canvas?.requestRenderAll()
  }

  /**
   * Apply canvas sync
   */
  private applyCanvasSync(data: Record<string, unknown>): void {
    const { objects } = data
    if (Array.isArray(objects)) {
      this.canvas?.clear()
      objects.forEach((objData: any) => {
        // Recreate object based on type
        // This is a placeholder
        console.log('[TimeTravelEngine] Syncing object:', objData)
      })
      this.canvas?.requestRenderAll()
    }
  }

  /**
   * Get events in a time range
   */
  getEvents(startTime?: number, endTime?: number): SessionEvent[] {
    return this.eventStore.getEvents(startTime, endTime)
  }

  /**
   * Get snapshots in a time range
   */
  getSnapshots(startTime?: number, endTime?: number): CanvasSnapshot[] {
    return this.eventStore.getSnapshots(startTime, endTime)
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop()
    this.callbacks = {}
  }
}

/**
 * Create a time travel engine instance
 */
export async function createTimeTravelEngine(roomId: string): Promise<TimeTravelEngine> {
  const eventStore = await createEventStore(roomId)
  return new TimeTravelEngine(eventStore)
}
