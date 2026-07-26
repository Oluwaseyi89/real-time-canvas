'use client'

/**
 * Minimap User Indicator Component
 * Renders individual collaborator indicators on the minimap radar display
 * with active status rings, tool badges, and tooltip previews.
 */

import { UserPresence } from '@/types/websocket'

interface UserIndicatorProps {
  user: UserPresence
  mapWidth: number
  mapHeight: number
  canvasWidth?: number
  canvasHeight?: number
  className?: string
}

export function UserIndicator({
  user,
  mapWidth,
  mapHeight,
  canvasWidth = 5000,
  canvasHeight = 5000,
  className = '',
}: UserIndicatorProps) {
  if (!user.cursor) return null

  // Calculate position relative to minimap dimensions
  // Normalizes cursor coordinates from canvas space to minimap px space
  const posX = Math.max(
    0,
    Math.min(mapWidth, (user.cursor.x / canvasWidth) * mapWidth)
  )
  const posY = Math.max(
    0,
    Math.min(mapHeight, (user.cursor.y / canvasHeight) * mapHeight)
  )

  // Extract first initial for fallback display
  const userInitial = user.username ? user.username.charAt(0).toUpperCase() : '?'

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group z-20 transition-all duration-150 ease-out ${className}`}
      style={{ left: `${posX}px`, top: `${posY}px` }}
    >
      {/* Indicator Pulse Ring */}
      <div className="relative flex items-center justify-center">
        {user.isActive && (
          <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-60" />
        )}

        {/* User Dot / Badge */}
        <div className="relative flex items-center justify-center w-3.5 h-3.5 rounded-full bg-indigo-600 border border-white/80 shadow-md text-[8px] font-bold text-white uppercase select-none">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{userInitial}</span>
          )}
        </div>
      </div>

      {/* Hover Tooltip Preview */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
        <div className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-100 text-[10px] font-medium tracking-wide whitespace-nowrap border border-slate-700/80 shadow-xl backdrop-blur-md">
          {user.username}
          {(user.selectedTool || user.activeTool) && (
            <span className="ml-1 text-[9px] text-indigo-400 font-mono">
              ({user.selectedTool || user.activeTool})
            </span>
          )}
        </div>
        {/* Tooltip Arrow */}
        <div className="w-1.5 h-1.5 bg-slate-900/90 border-r border-b border-slate-700/80 rotate-45 -mt-0.5" />
      </div>
    </div>
  )
}