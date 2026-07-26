'use client'

/**
 * Minimap Radar Overlay Component
 * Renders crosshair grid lines, concentric range rings, and animated user target pings
 * for high-tech spatial canvas tracking.
 */

import { useCollaborationStore } from '@/store/collaborationStore'

interface RadarProps {
  width: number
  height: number
  className?: string
}

export function Radar({ width, height, className = '' }: RadarProps) {
  const { users } = useCollaborationStore()
  const activeUsers = Array.from(users.values()).filter((u) => u.isActive)

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Target Crosshair & Concentric Range Rings */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25 text-cyan-500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="radar-grid"
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Grid Pattern Background */}
        <rect width="100%" height="100%" fill="url(#radar-grid)" />

        {/* Center Crosshair Lines */}
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Concentric Range Rings */}
        <circle
          cx="50%"
          cy="50%"
          r="25%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        />
      </svg>

      {/* Rotating Radar Sweeper Light */}
      <div className="absolute inset-0 origin-center animate-[spin_4s_linear_infinite] opacity-30">
        <div
          className="w-full h-full"
          style={{
            background:
              'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.4) 0deg, rgba(6, 182, 212, 0) 60deg, transparent 360deg)',
          }}
        />
      </div>

      {/* Collaborator Spatial Pings */}
      {activeUsers.map((user) => {
        if (!user.cursor) return null

        // Map normalized bounds to minimap container scale
        const pingX = (user.cursor.x / (width || 1)) * width
        const pingY = (user.cursor.y / (height || 1)) * height

        return (
          <div
            key={user.userId}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
            style={{ left: `${pingX}px`, top: `${pingY}px` }}
          >
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-sm shadow-emerald-400" />
            </span>
          </div>
        )
      })}
    </div>
  )
}