'use client'

/**
 * Room creation dialog component
 * Allows users to create a new room with name and privacy settings
 */

import { useState, useCallback } from 'react'
import { useRoom } from '@/hooks/useRoom'

interface CreateRoomDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (roomId: string) => void
}

export function CreateRoomDialog({ isOpen, onClose, onSuccess }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createRoom } = useRoom()

  const handleCreate = useCallback(async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const room = await createRoom(roomName, { isPrivate })
      if (room) {
        onSuccess?.(room.id)
        handleClose()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [roomName, isPrivate, createRoom, onSuccess])

  const handleClose = useCallback(() => {
    setRoomName('')
    setIsPrivate(false)
    setError(null)
    setIsLoading(false)
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Create New Room</h2>
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
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="My Awesome Room"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="private-room"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="private-room" className="text-sm text-gray-700">
              Make room private (require invite code)
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!roomName.trim() || isLoading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : '🚀 Create Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
