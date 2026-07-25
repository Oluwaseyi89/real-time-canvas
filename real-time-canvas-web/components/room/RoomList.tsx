'use client'

/**
 * Room list component
 * Displays list of rooms the user has created or joined
 */

import { useRoom } from '@/hooks/useRoom'
import { useAuth } from '@/hooks/useAuth'

interface RoomListProps {
  onSelectRoom?: (roomId: string) => void
  onJoinRoom?: () => void
  onCreateRoom?: () => void
}

export function RoomList({ onSelectRoom, onJoinRoom, onCreateRoom }: RoomListProps) {
  const { rooms, currentRoom, isLoading } = useRoom()
  const { username } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No rooms yet</p>
        <p className="text-gray-400 text-xs mt-1">Create or join a room to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rooms.map((room) => {
        const isActive = currentRoom?.id === room.id
        const userCount = room.users.length
        const isOwner = room.ownerId === username

        return (
          <div
            key={room.id}
            className={`p-3 rounded-lg border transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
            onClick={() => onSelectRoom?.(room.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 truncate">
                    {room.name}
                  </span>
                  {room.isPrivate && (
                    <span className="text-xs text-gray-400">🔒</span>
                  )}
                  {isOwner && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      Owner
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>👥 {userCount} members</span>
                  <span>📝 {room.objectCount} objects</span>
                  {room.inviteCode && (
                    <span className="text-gray-400">Code: {room.inviteCode}</span>
                  )}
                </div>
              </div>
              {isActive && (
                <div className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  Active
                </div>
              )}
            </div>
          </div>
        )
      })}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onJoinRoom}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Join Room
        </button>
        <button
          onClick={onCreateRoom}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Create Room
        </button>
      </div>
    </div>
  )
}
