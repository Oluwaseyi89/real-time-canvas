'use client'

/**
 * Room List Component
 * Renders a list of active canvas rooms created or joined by the user,
 * complete with member counts, privacy badges, invite code actions, and creation triggers.
 */

import { useState, useCallback } from 'react'
import { useRoom } from '@/hooks/useRoom'
import { useAuth } from '@/hooks/useAuth'

interface RoomListProps {
  onSelectRoom?: (roomId: string) => void
  onJoinRoom?: () => void
  onCreateRoom?: () => void
  className?: string
}

export function RoomList({
  onSelectRoom,
  onJoinRoom,
  onCreateRoom,
  className = '',
}: RoomListProps) {
  const { rooms, currentRoom, isLoading } = useRoom()
  const { username, userId } = useAuth()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopyCode = useCallback(
    async (code: string, e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await navigator.clipboard.writeText(code)
        setCopiedCode(code)
        setTimeout(() => setCopiedCode(null), 2000)
      } catch {
        // Clipboard access unavailable
      }
    },
    []
  )

  // Loading skeleton layout
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 animate-pulse space-y-2"
          >
            <div className="h-4 bg-slate-800 rounded w-1/2" />
            <div className="h-3 bg-slate-800/60 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Room list container */}
      {rooms.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
          <span className="text-3xl block mb-2">🎨</span>
          <p className="text-slate-300 text-xs font-semibold">No active rooms found</p>
          <p className="text-slate-500 text-[11px] mt-1 max-w-[220px] mx-auto">
            Create a new whiteboard session or join an existing room with a link.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {rooms.map((room) => {
            const isActive = currentRoom?.id === room.id
            const userCount = room.users?.length ?? 0
            // Compare against both username and userId for reliable owner detection
            const isOwner =
              (username && room.ownerId === username) ||
              (userId && room.ownerId === userId)

            return (
              <div
                key={room.id}
                onClick={() => onSelectRoom?.(room.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer group select-none ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                        {room.name}
                      </h3>
                      {room.isPrivate && (
                        <span className="text-[10px]" title="Private Room">
                          🔒
                        </span>
                      )}
                      {isOwner && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">
                          Owner
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="text-emerald-400">👥</span> {userCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-indigo-400">📝</span> {room.objectCount ?? 0}
                      </span>

                      {room.inviteCode && (
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(room.inviteCode!, e)}
                          className="text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 ml-auto"
                          title="Copy Invite Code"
                        >
                          <span className="text-[10px]">Code: {room.inviteCode}</span>
                          <span className="text-[10px]">
                            {copiedCode === room.inviteCode ? '✓' : '📋'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Persistent Action Buttons */}
      <div className="flex gap-2 pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={onJoinRoom}
          className="flex-1 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>🚪</span>
          <span>Join Room</span>
        </button>
        <button
          type="button"
          onClick={onCreateRoom}
          className="flex-1 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 border border-indigo-500/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>✨</span>
          <span>Create Room</span>
        </button>
      </div>
    </div>
  )
}