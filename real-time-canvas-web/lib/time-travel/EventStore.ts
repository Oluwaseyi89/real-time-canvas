/**
 * Event store for time travel
 * Manages event sourcing with IndexedDB persistence
 */

import localforage from 'localforage'
import type { SessionEvent, CanvasSnapshot, EventStore } from '@/types/time-travel'
import { v4 as uuidv4 } from 'uuid'

export class EventStoreImpl implements EventStore {
  events: SessionEvent[] = []
  snapshots: CanvasSnapshot[] = []
  private db: LocalForage | null = null
  private initialized: boolean = false
  private roomId: string

  constructor(roomId: string) {
    this.roomId = roomId
  }

  /**
   * Initialize the event store
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    this.db = localforage.createInstance({
      name: 'time-travel',
      storeName: `room-${this.roomId}`,
      version: 1,
      description: `Time travel store for room ${this.roomId}`,
    })

    // Load existing events and snapshots
    try {
      const storedEvents = await this.db.getItem<SessionEvent[]>('events')
      if (storedEvents) {
        this.events = storedEvents
      }

      const storedSnapshots = await this.db.getItem<CanvasSnapshot[]>('snapshots')
      if (storedSnapshots) {
        this.snapshots = storedSnapshots
      }
    } catch (error) {
      console.error('[EventStore] Failed to load data:', error)
    }

    this.initialized = true
    console.log(`[EventStore] Initialized with ${this.events.length} events and ${this.snapshots.length} snapshots`)
  }

  /**
   * Append an event to the store
   */
  async appendEvent(event: Omit<SessionEvent, 'id' | 'timestamp' | 'version'>): Promise<SessionEvent> {
    if (!this.initialized) {
      await this.initialize()
    }

    const newEvent: SessionEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now(),
      version: this.events.length + 1,
    }

    this.events.push(newEvent)

    // Save to IndexedDB
    if (this.db) {
      await this.db.setItem('events', this.events)
    }

    // Create snapshot every 50 events or on significant actions
    if (this.events.length % 50 === 0 || ['canvas:sync', 'canvas:clear'].includes(event.type)) {
      await this.createSnapshot()
    }

    return newEvent
  }

  /**
   * Append a snapshot to the store
   */
  async appendSnapshot(snapshot: CanvasSnapshot): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    this.snapshots.push(snapshot)

    if (this.db) {
      await this.db.setItem('snapshots', this.snapshots)
    }
  }

  /**
   * Create a snapshot of the current canvas state
   */
  async createSnapshot(objects: Array<{
    id: string
    type: string
    data: Record<string, unknown>
    position: { x: number; y: number }
    size: { width: number; height: number }
    rotation: number
    zIndex: number
  }> = []): Promise<void> {
    const snapshot: CanvasSnapshot = {
      id: uuidv4(),
      timestamp: Date.now(),
      roomId: this.roomId,
      objects,
      version: this.snapshots.length + 1,
    }

    await this.appendSnapshot(snapshot)
  }

  /**
   * Get events in a time range
   */
  getEvents(startTime?: number, endTime?: number): SessionEvent[] {
    let filtered = this.events

    if (startTime !== undefined) {
      filtered = filtered.filter(e => e.timestamp >= startTime)
    }

    if (endTime !== undefined) {
      filtered = filtered.filter(e => e.timestamp <= endTime)
    }

    return filtered
  }

  /**
   * Get snapshots in a time range
   */
  getSnapshots(startTime?: number, endTime?: number): CanvasSnapshot[] {
    let filtered = this.snapshots

    if (startTime !== undefined) {
      filtered = filtered.filter(s => s.timestamp >= startTime)
    }

    if (endTime !== undefined) {
      filtered = filtered.filter(s => s.timestamp <= endTime)
    }

    return filtered
  }

  /**
   * Get events since last snapshot
   */
  getEventsSinceLastSnapshot(): SessionEvent[] {
    const lastSnapshot = this.snapshots[this.snapshots.length - 1]
    if (!lastSnapshot) {
      return this.events
    }
    return this.getEvents(lastSnapshot.timestamp)
  }

  /**
   * Get event by ID
   */
  getEvent(id: string): SessionEvent | undefined {
    return this.events.find(e => e.id === id)
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): CanvasSnapshot | undefined {
    return this.snapshots.find(s => s.id === id)
  }

  /**
   * Get all events
   */
  getAllEvents(): SessionEvent[] {
    return this.events
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): CanvasSnapshot[] {
    return this.snapshots
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.events = []
    this.snapshots = []

    if (this.db) {
      await this.db.setItem('events', this.events)
      await this.db.setItem('snapshots', this.snapshots)
    }
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.length
  }

  /**
   * Get total storage size
   */
  async getStorageSize(): Promise<number> {
    if (!this.db) return 0

    let total = 0
    const keys = await this.db.keys()
    for (const key of keys) {
      const item = await this.db.getItem(key)
      if (item) {
        total += JSON.stringify(item).length
      }
    }
    return total
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify({
      roomId: this.roomId,
      exportedAt: new Date().toISOString(),
      eventCount: this.events.length,
      snapshotCount: this.snapshots.length,
      events: this.events,
      snapshots: this.snapshots,
    }, null, 2)
  }

  /**
   * Import events from JSON
   */
  async importEvents(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data)
      if (parsed.events) {
        this.events = parsed.events
      }
      if (parsed.snapshots) {
        this.snapshots = parsed.snapshots
      }

      if (this.db) {
        await this.db.setItem('events', this.events)
        await this.db.setItem('snapshots', this.snapshots)
      }
    } catch (error) {
      console.error('[EventStore] Failed to import events:', error)
      throw error
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.db = null
    this.initialized = false
  }
}

/**
 * Create an event store instance
 */
export async function createEventStore(roomId: string): Promise<EventStoreImpl> {
  const store = new EventStoreImpl(roomId)
  await store.initialize()
  return store
}
