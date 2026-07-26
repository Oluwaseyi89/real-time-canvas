'use client'

/**
 * Cursor Tracker Component
 * Renders smooth real-time remote user cursors over canvas viewports
 * with user name badges and active tool indicators.
 */

import { useWebSocketStore } from '@/store/websocketStore'
import { UserPresence } from '@/types/websocket'

interface CursorTrackerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function CursorTracker({ canvasRef }: CursorTrackerProps) {
  const { users } = useWebSocketStore()

  const canvas = canvasRef.current
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const activeUsers = Array.from(users.values()).filter((u) => u.cursor)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {activeUsers.map((user) => {
        if (!user.cursor) return null

        // Scale normalized canvas coordinates to viewport bounds
        const x = (user.cursor.x / (canvas.width || 1)) * rect.width
        const y = (user.cursor.y / (canvas.height || 1)) * rect.height
        const userColor = getUserColor(user.userId)

        return (
          <div
            key={user.userId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out will-change-transform"
            style={{
              transform: `translate3d(${x}px, ${y}px, 0)`,
            }}
          >
            {/* Pointer SVG */}
            <svg
              className="w-5 h-5 -translate-x-1 -translate-y-1 drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                fill={userColor}
                stroke="#0f172a"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Username Badge */}
            <div
              className="ml-4 -mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-white/20 backdrop-blur-xs"
              style={{ backgroundColor: userColor }}
            >
              <span>{user.username || 'Collaborator'}</span>
              
              {/* Optional Active Tool Badge */}
              {user.activeTool && (
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-black/20">
                  {user.activeTool}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Deterministic color picker for remote user badges
 */
function getUserColor(userId: string): string {
  if (!userId) return '#3b82f6'

  const PALETTE = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return PALETTE[Math.abs(hash) % PALETTE.length]
}