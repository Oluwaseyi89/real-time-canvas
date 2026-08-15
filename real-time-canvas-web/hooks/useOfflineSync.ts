/**
 * Custom hook for offline sync
 * Provides offline queue management and conflict resolution
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { OfflineDB, createOfflineDB } from '@/lib/offline/indexDB'
import { SyncEngine, createSyncEngine } from '@/lib/offline/syncEngine'
import type { OfflineOperation, OfflineSyncStatus, SyncEventRecord } from '@/types/offline'
import * as Y from 'yjs'

interface UseOfflineSyncOptions {
  roomId: string
  userId: string
  enabled?: boolean
  onSyncStart?: () => void
  onSyncComplete?: () => void
  onSyncError?: (error: Error) => void
}

export function useOfflineSync(options: UseOfflineSyncOptions) {
  const {
    roomId,
    userId,
    enabled = true,
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options

  const [db, setDb] = useState<OfflineDB | null>(null)
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null)
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    totalOperations: 0,
  })
  const [isReady, setIsReady] = useState(false)
  const mountedRef = useRef(true)

  /**
   * Initialize offline storage
   */
  const initialize = useCallback(async () => {
    if (!enabled || !mountedRef.current) return

    try {
      const offlineDB = await createOfflineDB()
      if (!mountedRef.current) return
      setDb(offlineDB)

      const engine = await createSyncEngine(offlineDB, roomId)
      if (!mountedRef.current) return

      // Register callbacks
      engine.on('onSyncStart', () => {
        onSyncStart?.()
        if (mountedRef.current) {
          setStatus(prev => ({ ...prev, isSyncing: true }))
        }
      })

      engine.on('onSyncComplete', () => {
        onSyncComplete?.()
        if (mountedRef.current) {
          setStatus(prev => ({ ...prev, isSyncing: false }))
        }
      })

      engine.on('onSyncError', (error) => {
        onSyncError?.(error)
        if (mountedRef.current) {
          setStatus(prev => ({ ...prev, isSyncing: false }))
        }
      })

      engine.on('onOperationProcessed', () => {
        if (mountedRef.current) {
          updateStatus(engine)
        }
      })

      setSyncEngine(engine)
      setIsReady(true)
      
      // Update initial status
      await updateStatus(engine)

      console.log('[useOfflineSync] Initialized successfully')
    } catch (error) {
      console.error('[useOfflineSync] Initialization failed:', error)
    }
  }, [enabled, roomId, onSyncStart, onSyncComplete, onSyncError])

  /**
   * Update sync status
   */
  const updateStatus = useCallback(async (engine: SyncEngine) => {
    if (!mountedRef.current) return
    const newStatus = await engine.getSyncStatus()
    setStatus(newStatus)
  }, [])

  /**
   * Queue an offline operation
   */
  const queueOperation = useCallback(async (
    type: OfflineOperation['type'],
    payload: Record<string, unknown>
  ) => {
    if (!syncEngine) {
      throw new Error('Sync engine not initialized')
    }

    const operation = await syncEngine.queueOperation(type, payload)
    
    // Update status
    await updateStatus(syncEngine)
    
    return operation
  }, [syncEngine, updateStatus])

  /**
   * Process the offline queue
   */
  const processQueue = useCallback(async () => {
    if (!syncEngine) return
    await syncEngine.processQueue()
    await updateStatus(syncEngine)
  }, [syncEngine, updateStatus])

  /**
   * Fetch sync events missed while offline/disconnected (does not apply
   * them — the caller owns how a given eventType gets replayed onto the
   * canvas, since this hook has no Fabric/canvas context of its own)
   */
  const fetchMissedEvents = useCallback(async (): Promise<SyncEventRecord[]> => {
    if (!syncEngine) return []
    return syncEngine.fetchMissedEvents()
  }, [syncEngine])

  /**
   * Confirm missed events up to `version` were actually applied, so the
   * next fetchMissedEvents doesn't re-fetch them
   */
  const acknowledgeSyncVersion = useCallback(async (version: number): Promise<void> => {
    if (!syncEngine) return
    await syncEngine.acknowledgeSyncVersion(version)
  }, [syncEngine])

  /**
   * Get or create a Yjs document
   */
  const getDocument = useCallback(async (docId: string): Promise<Y.Doc> => {
    if (!syncEngine) {
      throw new Error('Sync engine not initialized')
    }
    return await syncEngine.getOrCreateDocument(docId)
  }, [syncEngine])

  /**
   * Sync a Yjs document
   */
  const syncDocument = useCallback(async (docId: string) => {
    if (!syncEngine) {
      throw new Error('Sync engine not initialized')
    }
    await syncEngine.syncDocument(docId)
    await updateStatus(syncEngine)
  }, [syncEngine, updateStatus])

  /**
   * Update online status
   */
  const updateOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine
    if (syncEngine) {
      syncEngine.setOnlineStatus(isOnline)
    }
    setStatus(prev => ({ ...prev, isOnline }))
  }, [syncEngine])

  /**
   * Clean up
   */
  const cleanup = useCallback(() => {
    if (syncEngine) {
      syncEngine.dispose()
    }
    mountedRef.current = false
  }, [syncEngine])

  // Initialize on mount
  useEffect(() => {
    if (enabled) {
      initialize()
    }

    // Set up online/offline listeners
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      cleanup()
    }
  }, [enabled, initialize, updateOnlineStatus, cleanup])

  // Update status periodically
  useEffect(() => {
    if (!syncEngine || !isReady) return

    const interval = setInterval(() => {
      updateStatus(syncEngine)
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [syncEngine, isReady, updateStatus])

  return {
    db,
    syncEngine,
    isReady,
    status,
    queueOperation,
    processQueue,
    fetchMissedEvents,
    acknowledgeSyncVersion,
    getDocument,
    syncDocument,
    updateOnlineStatus,
    cleanup,
  }
}
