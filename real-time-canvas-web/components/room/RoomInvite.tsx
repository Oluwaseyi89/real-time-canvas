'use client'

/**
 * Room Invite Component
 * Displays the room invite URL and code with quick-copy capabilities
 * and options to toggle embedded invite codes.
 */

import { useState, useCallback } from 'react'
import { useRoom } from '@/hooks/useRoom'

interface RoomInviteProps {
  className?: string
}

export function RoomInvite({ className = '' }: RoomInviteProps) {
  const { currentRoom, getRoomInviteLink, getRoomInviteLinkWithCode, copyInviteLink } = useRoom()
  const [isCopied, setIsCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const inviteLink = showCode 
    ? getRoomInviteLinkWithCode() 
    : getRoomInviteLink()

  const handleCopy = useCallback(async () => {
    const success = await copyInviteLink()
    if (success) {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }, [copyInviteLink])

  if (!currentRoom) return null

  return (
    <div
      className={`w-80 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 text-slate-100 shadow-2xl backdrop-blur-xl select-none transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔗</span>
          <h4 className="text-xs font-semibold tracking-wider text-slate-100 uppercase">
            Invite to Room
          </h4>
        </div>
        {currentRoom.isPrivate && (
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            {showCode ? 'Hide Code URL' : 'Embed Code'}
          </button>
        )}
      </div>

      {/* Invite Link & Copy Input Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inviteLink}
          readOnly
          className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/80 transition-colors cursor-text"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-lg ${
            isCopied
              ? 'bg-emerald-600 text-white border border-emerald-500/50 shadow-emerald-950/50'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-indigo-950/50'
          }`}
        >
          <span>{isCopied ? '✓' : '📋'}</span>
          <span>{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Invite Code Sub-info */}
      {currentRoom.inviteCode && (
        <div className="mt-3 p-2 bg-slate-900/60 border border-slate-800/80 rounded-xl text-[11px] font-mono flex items-center justify-between">
          <span className="text-slate-400">Invite Code:</span>
          <span className="text-indigo-300 font-semibold tracking-wider bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40">
            {currentRoom.inviteCode}
          </span>
        </div>
      )}
    </div>
  )
}