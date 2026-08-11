'use client'

/**
 * Room info component
 * Displays room information and member list
 */

import { useRoom } from '@/hooks/useRoom'

interface RoomInfoProps {
  className?: string
}

export function RoomInfo({ className = '' }: RoomInfoProps) {
  const { currentRoom, isOwner } = useRoom()

  if (!currentRoom) return null

  const createdAt = new Date(currentRoom.createdAt).toLocaleDateString()

  return (
    <div className={`w-72 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-slate-200 select-none ${className}`}>
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-800/80">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Room Info</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Created {createdAt}</p>
        </div>
        {isOwner && (
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded">
            Owner
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-[11px] font-mono">
        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">Room ID</span>
          <span className="text-slate-200">{currentRoom.id.slice(0, 10)}</span>
        </div>

        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">Members</span>
          <span className="text-slate-200">{currentRoom.users.length}</span>
        </div>

        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">Objects</span>
          <span className="text-slate-200">{currentRoom.objectCount}</span>
        </div>

        <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
          <span className="text-slate-400">Privacy</span>
          <span className="text-slate-200">
            {currentRoom.isPrivate ? '🔒 Private' : '🌐 Public'}
          </span>
        </div>
      </div>

      {currentRoom.users.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Members</p>
          <div className="flex flex-wrap gap-1.5">
            {currentRoom.users.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/60 border border-slate-800/60 rounded-full text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">{user.username}</span>
                {user.role === 'owner' && (
                  <span className="text-amber-400 text-[10px]">👑</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
