'use client'

/**
 * Room join dialog component
 * Allows users to join a room using room ID or invite link
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoom } from '@/hooks/useRoom'

interface JoinRoomDialogProps {
  isOpen: boolean
  onClose: () => void
  initialRoomId?: string
  initialInviteCode?: string
  onSuccess?: (roomId: string) => void
}

export function JoinRoomDialog({
  isOpen,
  onClose,
  initialRoomId = '',
  initialInviteCode = '',
  onSuccess,
}: JoinRoomDialogProps) {
  const [roomId, setRoomId] = useState(initialRoomId)
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { joinRoom } = useRoom()

  // Parse invite link when it changes
  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId)
    }
    if (initialInviteCode) {
      setInviteCode(initialInviteCode)
    }
  }, [initialRoomId, initialInviteCode])

  const handleJoin = useCallback(async () => {
    const roomIdToJoin = roomId.trim() || initialRoomId
    if (!roomIdToJoin) {
      setError('Please enter a room ID or invite link')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const room = await joinRoom(roomIdToJoin, inviteCode.trim() || undefined)
      if (room) {
        onSuccess?.(room.id)
        handleClose()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [roomId, inviteCode, initialRoomId, joinRoom, onSuccess])

  const handleClose = useCallback(() => {
    setRoomId('')
    setInviteCode('')
    setError(null)
    setIsLoading(false)
    onClose()
  }, [onClose])

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      // Extract room ID from URL if present
      const urlMatch = text.match(/\/room\/([a-zA-Z0-9_-]+)/)
      if (urlMatch) {
        setRoomId(urlMatch[1])
      } else if (text.length > 0 && text.length < 50) {
        setRoomId(text.trim())
      }
    } catch (error) {
      // Silently fail if clipboard access is denied
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Join Room</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room ID or Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Paste room ID or link"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
              />
              <button
                onClick={handlePaste}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                title="Paste from clipboard"
              >
                📋
              </button>
            </div>
          </div>

          {inviteCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Code (optional)
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Joining...' : '🚀 Join Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
