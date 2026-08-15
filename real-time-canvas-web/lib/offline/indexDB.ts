/**
 * IndexedDB service for offline storage
 * Manages local database for offline operations and documents
 */

import localforage from 'localforage'
import type { OfflineOperation, OfflineDocumentStore, YjsDocMetadata } from '@/types/offline'

/**
 * Offline database service
 */
export class OfflineDB {
  private static instance: OfflineDB
  private db: LocalForage
  private initialized: boolean = false

  private constructor() {
    this.db = localforage.createInstance({
      name: 'collaborative-canvas',
      storeName: 'offline-store',
      version: 1,
      description: 'Offline storage for collaborative canvas',
    })
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OfflineDB {
    if (!OfflineDB.instance) {
      OfflineDB.instance = new OfflineDB()
    }
    return OfflineDB.instance
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Test connection
      await this.db.setItem('test', 'connected')
      await this.db.removeItem('test')
      this.initialized = true
      console.log('[OfflineDB] Initialized successfully')
    } catch (error) {
      console.error('[OfflineDB] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return this.initialized
  }

  /**
   * Save an operation to the offline queue
   */
  async saveOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<OfflineOperation> {
    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newOperation: OfflineOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    }

    const queue = await this.getQueue()
    queue.push(newOperation)
    await this.db.setItem('operations', queue)

    console.log('[OfflineDB] Operation saved:', newOperation.id)
    return newOperation
  }

  /**
   * Get all pending operations from the queue
   */
  async getQueue(): Promise<OfflineOperation[]> {
    const queue = await this.db.getItem<OfflineOperation[]>('operations')
    return queue || []
  }

  /**
   * Get pending operations (not completed)
   */
  async getPendingOperations(): Promise<OfflineOperation[]> {
    const queue = await this.getQueue()
    return queue.filter(op => op.status === 'pending' || op.status === 'processing')
  }

  /**
   * Get failed operations
   */
  async getFailedOperations(): Promise<OfflineOperation[]> {
    const queue = await this.getQueue()
    return queue.filter(op => op.status === 'failed')
  }

  /**
   * Update operation status
   */
  async updateOperationStatus(id: string, status: OfflineOperation['status']): Promise<void> {
    const queue = await this.getQueue()
    const index = queue.findIndex(op => op.id === id)
    if (index === -1) {
      console.warn('[OfflineDB] Operation not found:', id)
      return
    }

    queue[index].status = status
    if (status === 'failed') {
      queue[index].retryCount += 1
    }
    await this.db.setItem('operations', queue)
  }

  /**
   * Remove operation from queue
   */
  async removeOperation(id: string): Promise<void> {
    const queue = await this.getQueue()
    const filtered = queue.filter(op => op.id !== id)
    await this.db.setItem('operations', filtered)
  }

  /**
   * Clear all operations
   */
  async clearQueue(): Promise<void> {
    await this.db.setItem('operations', [])
  }

  /**
   * Save a Yjs document
   */
  async saveDocument(docId: string, data: Uint8Array | Record<string, unknown>): Promise<void> {
    await this.db.setItem(`doc_${docId}`, data)
  }

  /**
   * Get a Yjs document
   */
  async getDocument(docId: string): Promise<Uint8Array | Record<string, unknown> | null> {
    return await this.db.getItem(`doc_${docId}`)
  }

  /**
   * Delete a Yjs document
   */
  async deleteDocument(docId: string): Promise<void> {
    await this.db.removeItem(`doc_${docId}`)
  }

  /**
   * Get all document IDs
   */
  async getDocumentIds(): Promise<string[]> {
    const keys = await this.db.keys()
    return keys.filter(key => key.startsWith('doc_')).map(key => key.substring(4))
  }

  /**
   * Save document metadata
   */
  async saveDocumentMetadata(metadata: YjsDocMetadata): Promise<void> {
    const meta = await this.getDocumentMetadata()
    meta[metadata.id] = metadata
    await this.db.setItem('doc_metadata', meta)
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(): Promise<Record<string, YjsDocMetadata>> {
    return (await this.db.getItem('doc_metadata')) || {}
  }

  /**
   * Delete document metadata
   */
  async deleteDocumentMetadata(docId: string): Promise<void> {
    const meta = await this.getDocumentMetadata()
    delete meta[docId]
    await this.db.setItem('doc_metadata', meta)
  }

  /**
   * Save last sync timestamp
   */
  async setLastSync(time: Date): Promise<void> {
    await this.db.setItem('lastSync', time.toISOString())
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync(): Promise<Date | null> {
    const value = await this.db.getItem<string>('lastSync')
    return value ? new Date(value) : null
  }

  /**
   * Get the highest sync-event version applied for a room, so a reconnect
   * only fetches what happened after it (defaults to 0 = "everything").
   */
  async getSyncVersion(roomId: string): Promise<number> {
    const value = await this.db.getItem<number>(`syncVersion_${roomId}`)
    return value ?? 0
  }

  /**
   * Save the highest sync-event version applied for a room
   */
  async setSyncVersion(roomId: string, version: number): Promise<void> {
    await this.db.setItem(`syncVersion_${roomId}`, version)
  }

  /**
   * Save app version
   */
  async setVersion(version: string): Promise<void> {
    await this.db.setItem('version', version)
  }

  /**
   * Get app version
   */
  async getVersion(): Promise<string | null> {
    return await this.db.getItem('version')
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    await this.db.clear()
    console.log('[OfflineDB] All data cleared')
  }

  /**
   * Get total storage size
   */
  async getStorageSize(): Promise<number> {
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
}

/**
 * Create and initialize the offline database
 */
export async function createOfflineDB(): Promise<OfflineDB> {
  const db = OfflineDB.getInstance()
  await db.initialize()
  return db
}
