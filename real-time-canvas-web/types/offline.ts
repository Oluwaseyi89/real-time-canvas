/**
 * Offline sync types
 * Defines offline storage, queues, and sync operations
 */

import { WebSocketMessage } from './websocket'

/**
 * Offline operation types
 */
export type OfflineOperationType = 
  | 'object:create'
  | 'object:update'
  | 'object:delete'
  | 'object:move'
  | 'canvas:sync'
  | 'physics:throw'
  | 'physics:collision'
  | 'user:presence'

/**
 * Offline operation stored in queue
 */
export interface OfflineOperation {
  id: string
  type: OfflineOperationType
  payload: Record<string, unknown>
  timestamp: number
  retryCount: number
  maxRetries: number
  status: 'pending' | 'processing' | 'failed' | 'completed'
}

/**
 * Offline queue state
 */
export interface OfflineQueueState {
  operations: OfflineOperation[]
  processing: boolean
  lastSync: Date | null
  syncInProgress: boolean
}

/**
 * Offline storage keys
 */
export interface OfflineStorageKeys {
  QUEUE: string
  DOCS: string
  VERSION: string
  LAST_SYNC: string
}

/**
 * Offline sync status
 */
export interface OfflineSyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSync: Date | null
  totalOperations: number
}

/**
 * Offline document store
 */
export interface OfflineDocumentStore {
  [key: string]: unknown
}

/**
 * Yjs document metadata
 */
export interface YjsDocMetadata {
  id: string
  roomId: string
  createdAt: Date
  updatedAt: Date
  version: number
  size: number
}
