/**
 * Offline sync engine
 * Handles conflict resolution with Yjs CRDTs and queue processing
 */

import * as Y from 'yjs'
import { OfflineDB } from './indexDB'
import type { OfflineOperation, OfflineSyncStatus } from '@/types/offline'
import type { WebSocketMessage } from '@/types/websocket'

/**
 * Sync engine class for offline operations
 */
export class SyncEngine {
  private db: OfflineDB
  private isOnline: boolean = true
  private isSyncing: boolean = false
  private syncQueue: OfflineOperation[] = []
  private docs: Map<string, Y.Doc> = new Map()
  private callbacks: {
    onSyncStart?: () => void
    onSyncComplete?: () => void
    onSyncError?: (error: Error) => void
    onOperationProcessed?: (operation: OfflineOperation) => void
    onConflict?: (local: unknown, remote: unknown) => unknown
  } = {}

  constructor(db: OfflineDB) {
    this.db = db
    this.init()
  }

  /**
   * Initialize the sync engine
   */
  private async init(): Promise<void> {
    await this.loadQueue()
    await this.loadDocuments()
    console.log('[SyncEngine] Initialized')
  }

  /**
   * Load queue from database
   */
  private async loadQueue(): Promise<void> {
    this.syncQueue = await this.db.getPendingOperations()
  }

  /**
   * Load Yjs documents from database
   */
  private async loadDocuments(): Promise<void> {
    const docIds = await this.db.getDocumentIds()
    for (const docId of docIds) {
      const data = await this.db.getDocument(docId)
      if (data && data instanceof Uint8Array) {
        const doc = new Y.Doc()
        Y.applyUpdate(doc, data)
        this.docs.set(docId, doc)
      }
    }
  }

  /**
   * Register event callbacks
   */
  on<K extends keyof typeof this.callbacks>(
    event: K,
    callback: NonNullable<(typeof this.callbacks)[K]>
  ): void {
    this.callbacks[event] = callback
  }

  /**
   * Set online status
   */
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline
    if (isOnline) {
      this.processQueue()
    }
  }

  /**
   * Process the offline queue
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return

    const pendingOps = await this.db.getPendingOperations()
    if (pendingOps.length === 0) return

    this.isSyncing = true
    this.callbacks.onSyncStart?.()

    console.log(`[SyncEngine] Processing ${pendingOps.length} operations`)

    for (const op of pendingOps) {
      await this.processOperation(op)
    }

    this.isSyncing = false
    this.callbacks.onSyncComplete?.()
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: OfflineOperation): Promise<void> {
    await this.db.updateOperationStatus(operation.id, 'processing')

    try {
      // Apply the operation (mock implementation)
      const result = await this.applyOperation(operation)
      
      if (result.success) {
        await this.db.updateOperationStatus(operation.id, 'completed')
        await this.db.removeOperation(operation.id)
        this.callbacks.onOperationProcessed?.(operation)
      } else {
        throw new Error(result.error || 'Operation failed')
      }
    } catch (error) {
      console.error(`[SyncEngine] Operation ${operation.id} failed:`, error)
      const op = await this.db.getQueue().then(queue => queue.find(o => o.id === operation.id))
      if (op && op.retryCount >= op.maxRetries) {
        await this.db.updateOperationStatus(operation.id, 'failed')
        this.callbacks.onSyncError?.(error instanceof Error ? error : new Error(String(error)))
      } else {
        await this.db.updateOperationStatus(operation.id, 'pending')
      }
    }
  }

  /**
   * Apply an operation (mock implementation)
   */
  private async applyOperation(operation: OfflineOperation): Promise<{ success: boolean; error?: string }> {
    // In production, this would communicate with the server
    // For now, we simulate success
    console.log(`[SyncEngine] Applying operation: ${operation.type}`, operation.payload)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return { success: true }
  }

  /**
   * Queue an offline operation
   */
  async queueOperation(
    type: OfflineOperation['type'],
    payload: Record<string, unknown>
  ): Promise<OfflineOperation> {
    const operation = await this.db.saveOperation({ type, payload })
    this.syncQueue.push(operation)
    
    // If online, process immediately
    if (this.isOnline) {
      await this.processQueue()
    }
    
    return operation
  }

  /**
   * Sync a Yjs document
   */
  async syncDocument(docId: string): Promise<void> {
    const doc = this.docs.get(docId)
    if (!doc) return

    // Get the current state as binary
    const state = Y.encodeStateAsUpdate(doc)
    await this.db.saveDocument(docId, state)

    // Update metadata
    const meta = await this.db.getDocumentMetadata()
    if (meta[docId]) {
      meta[docId].updatedAt = new Date()
      meta[docId].version += 1
      meta[docId].size = state.length
      await this.db.saveDocumentMetadata(meta[docId])
    }
  }

  /**
   * Create a new Yjs document
   */
  createDocument(docId: string): Y.Doc {
    const doc = new Y.Doc()
    this.docs.set(docId, doc)

    // Save initial state
    const state = Y.encodeStateAsUpdate(doc)
    this.db.saveDocument(docId, state)

    // Save metadata
    const metadata = {
      id: docId,
      roomId: docId.split('_')[1] || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      size: state.length,
    }
    this.db.saveDocumentMetadata(metadata)

    return doc
  }

  /**
   * Get a Yjs document
   */
  getDocument(docId: string): Y.Doc | undefined {
    return this.docs.get(docId)
  }

  /**
   * Get or create a Yjs document
   */
  async getOrCreateDocument(docId: string): Promise<Y.Doc> {
    let doc = this.docs.get(docId)
    if (!doc) {
      const data = await this.db.getDocument(docId)
      if (data && data instanceof Uint8Array) {
        doc = new Y.Doc()
        Y.applyUpdate(doc, data)
        this.docs.set(docId, doc)
      } else {
        doc = this.createDocument(docId)
      }
    }
    return doc
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<OfflineSyncStatus> {
    const pending = await this.db.getPendingOperations()
    const lastSync = await this.db.getLastSync()
    
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: pending.length,
      lastSync,
      totalOperations: pending.length,
    }
  }

  /**
   * Handle merge conflicts (CRDT resolution)
   */
  resolveConflict(local: unknown, remote: unknown): unknown {
    if (this.callbacks.onConflict) {
      return this.callbacks.onConflict(local, remote)
    }
    // Default: remote wins
    return remote
  }

  /**
   * Clean up expired operations
   */
  async cleanup(): Promise<void> {
    const queue = await this.db.getQueue()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const expired = queue.filter(op => 
      op.status === 'failed' && op.timestamp < sevenDaysAgo
    )
    
    for (const op of expired) {
      await this.db.removeOperation(op.id)
    }
    
    console.log(`[SyncEngine] Cleaned up ${expired.length} expired operations`)
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.docs.forEach(doc => doc.destroy())
    this.docs.clear()
    this.syncQueue = []
    this.callbacks = {}
  }
}

/**
 * Create a new sync engine instance
 */
export async function createSyncEngine(db: OfflineDB): Promise<SyncEngine> {
  return new SyncEngine(db)
}
