/**
 * Time travel types for session replay
 * Defines events, snapshots, and replay controls
 */

/**
 * Session event types
 */
export type SessionEventType =
  | 'object:create'
  | 'object:update'
  | 'object:delete'
  | 'object:move'
  | 'canvas:clear'
  | 'canvas:sync'
  | 'physics:throw'
  | 'user:join'
  | 'user:leave'
  | 'canvas:zoom'
  | 'canvas:pan'

/**
 * Session event
 */
export interface SessionEvent {
  id: string
  type: SessionEventType
  timestamp: number
  userId: string
  roomId: string
  data: Record<string, unknown>
  version: number
}

/**
 * Canvas snapshot
 */
export interface CanvasSnapshot {
  id: string
  timestamp: number
  roomId: string
  objects: Array<{
    id: string
    type: string
    data: Record<string, unknown>
    position: { x: number; y: number }
    size: { width: number; height: number }
    rotation: number
    zIndex: number
  }>
  version: number
}

/**
 * Time travel state
 */
export interface TimeTravelState {
  isRecording: boolean
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  speed: number
  events: SessionEvent[]
  snapshots: CanvasSnapshot[]
  currentEventIndex: number
  isReplaying: boolean
}

/**
 * Time travel controls
 */
export interface TimeTravelControls {
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  stepForward: () => void
  stepBackward: () => void
  setSpeed: (speed: number) => void
  toggleRecording: () => void
}

/**
 * Replay options
 */
export interface ReplayOptions {
  startTime?: number
  endTime?: number
  speed?: number
  loop?: boolean
  includePhysics?: boolean
  includeUserEvents?: boolean
}

/**
 * Event sourcing store
 */
export interface EventStore {
  events: SessionEvent[]
  snapshots: CanvasSnapshot[]
  appendEvent: (event: SessionEvent) => void
  appendSnapshot: (snapshot: CanvasSnapshot) => void
  getEvents: (startTime?: number, endTime?: number) => SessionEvent[]
  getSnapshots: (startTime?: number, endTime?: number) => CanvasSnapshot[]
  clear: () => void
  getEventCount: () => number
  getSnapshotCount: () => number
}
