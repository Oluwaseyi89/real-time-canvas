'use client'

/**
 * Room invite component
 * Displays room invite link with copy functionality
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
    <div className={`bg-white rounded-lg shadow border border-border-light p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-gray-700">Invite to Room</h4>
        {currentRoom.isPrivate && (
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showCode ? 'Hide Code' : 'Show Invite Code'}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inviteLink}
          readOnly
          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-text"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          {isCopied ? '✅ Copied!' : '📋 Copy'}
        </button>
      </div>

      {currentRoom.inviteCode && (
        <div className="mt-2 text-xs text-gray-500">
          Invite Code: <span className="font-mono font-medium">{currentRoom.inviteCode}</span>
          <span className="ml-2 text-gray-400">
            (Share this code with others to join)
          </span>
        </div>
      )}
    </div>
  )
}
