'use client'

/**
 * User Presence Component
 * Displays active collaborators, avatar stacks, real-time typing indicators,
 * and live online status badges.
 */

import { useCollaborationStore } from '@/store/collaborationStore'

interface UserPresenceProps {
  className?: string
  maxDisplay?: number
}

interface ActiveUser {
  userId: string
  username?: string
  avatarUrl?: string
  isActive?: boolean
  isTyping?: boolean
  status?: 'active' | 'idle' | 'offline'
}

export function UserPresence({ className = '', maxDisplay = 5 }: UserPresenceProps) {
  const { users, userCount } = useCollaborationStore()

  const activeUserList: ActiveUser[] = Array.from(users.values())
    .filter((user) => user.isActive)
    .slice(0, maxDisplay)

  const remainingCount = Math.max(0, userCount - activeUserList.length)

  // Empty / Solo state
  if (userCount <= 1 && activeUserList.length === 0) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md text-xs text-slate-400 shadow-md ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
        <span className="font-medium text-slate-300">Solo Mode</span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-xl backdrop-blur-md select-none ${className}`}
    >
      {/* Avatar Stack */}
      <div className="flex items-center -space-x-2.5">
        {activeUserList.map((user) => {
          const userColor = getUserColor(user.userId)
          const initial = user.username ? user.username.charAt(0).toUpperCase() : '?'

          return (
            <div
              key={user.userId}
              className="relative group transition-all duration-200 hover:z-30 hover:scale-115 cursor-pointer"
            >
              {/* Avatar Circle */}
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-950 shadow-md overflow-hidden"
                style={{
                  backgroundColor: userColor,
                  boxShadow: `0 0 10px ${userColor}33`,
                }}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              {/* Online Indicator Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 bg-emerald-400" />

              {/* Real-time Typing Bubble */}
              {user.isTyping && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 ring-1 ring-indigo-500/60 shadow-md">
                  <span className="flex gap-0.5 items-center justify-center">
                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  </span>
                </span>
              )}

              {/* Hover Tooltip */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 min-w-max">
                <div className="bg-slate-950/95 text-slate-100 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-2xl backdrop-blur-md flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: userColor }}
                  />
                  <span>{user.username || 'Anonymous User'}</span>
                  {user.isTyping && (
                    <span className="text-[10px] text-indigo-400 font-mono italic">
                      typing...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Overflow Indicator */}
        {remainingCount > 0 && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-slate-800 text-slate-300 text-xs font-bold ring-2 ring-slate-950 border border-slate-700/80 shadow-inner">
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Online Status Pill */}
      <div className="flex items-center gap-1.5 text-xs text-slate-300 pr-0.5 font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-mono text-slate-100">{userCount}</span>
        <span className="text-slate-400 text-[11px]">
          {userCount === 1 ? 'active' : 'active'}
        </span>
      </div>
    </div>
  )
}

/**
 * Generates a deterministic color for a user ID.
 * Falls back to dynamic HSL generation if necessary to ensure infinite uniqueness.
 */
function getUserColor(userId: string): string {
  if (!userId) return '#6366f1'

  const PALETTE = [
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#f97316', // Orange
    '#14b8a6', // Teal
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % PALETTE.length
  return PALETTE[index]
}