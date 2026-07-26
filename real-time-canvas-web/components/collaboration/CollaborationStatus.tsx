'use client'

/**
 * Collaboration Status Component
 * Displays real-time WebSocket connection state, reconnecting alerts,
 * and quick-action reconnect buttons.
 */

import { useWebSocketStore } from '@/store/websocketStore'
import { ConnectionState } from '@/types/websocket'

interface CollaborationStatusProps {
  className?: string
  showLabel?: boolean
  onReconnect?: () => void
}

export function CollaborationStatus({
  className = '',
  showLabel = true,
  onReconnect,
}: CollaborationStatusProps) {
  const { connectionState, setConnectionState } = useWebSocketStore()

  const statusConfig: Record<
    ConnectionState,
    { label: string; dotColor: string; pingColor: string; badgeBg: string }
  > = {
    connected: {
      label: 'Connected',
      dotColor: 'bg-emerald-500',
      pingColor: 'bg-emerald-400',
      badgeBg: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300',
    },
    connecting: {
      label: 'Connecting...',
      dotColor: 'bg-amber-500',
      pingColor: 'bg-amber-400',
      badgeBg: 'bg-amber-950/40 border-amber-800/50 text-amber-300',
    },
    reconnecting: {
      label: 'Reconnecting...',
      dotColor: 'bg-amber-500',
      pingColor: 'bg-amber-400',
      badgeBg: 'bg-amber-950/40 border-amber-800/50 text-amber-300',
    },
    disconnected: {
      label: 'Offline',
      dotColor: 'bg-rose-500',
      pingColor: 'bg-rose-400',
      badgeBg: 'bg-rose-950/40 border-rose-800/50 text-rose-300',
    },
    error: {
      label: 'Connection Error',
      dotColor: 'bg-rose-600',
      pingColor: 'bg-rose-500',
      badgeBg: 'bg-rose-950/60 border-rose-800/80 text-rose-200',
    },
  }

  const current = statusConfig[connectionState] || statusConfig.disconnected

  const handleRetry = () => {
    if (onReconnect) {
      onReconnect()
    } else {
      setConnectionState('connecting')
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium backdrop-blur-md transition-all duration-200 select-none ${current.badgeBg} ${className}`}
    >
      {/* Live Status Indicator Ping */}
      <span className="relative flex h-2 w-2">
        {(connectionState === 'connected' ||
          connectionState === 'reconnecting' ||
          connectionState === 'connecting') && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.pingColor}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${current.dotColor}`}
        />
      </span>

      {/* Connection State Label */}
      {showLabel && <span>{current.label}</span>}

      {/* Manual Reconnect Action Button */}
      {(connectionState === 'disconnected' || connectionState === 'error') && (
        <button
          onClick={handleRetry}
          className="ml-1 px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800/80 text-[10px] font-semibold text-rose-100 border border-rose-700/60 transition-colors cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  )
}