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
    <div className={`bg-white rounded-lg shadow border border-border-light p-4 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700">Room Info</h4>
          <p className="text-xs text-gray-500 mt-0.5">Created {createdAt}</p>
        </div>
        {isOwner && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
            Owner
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Room ID</span>
          <span className="font-mono text-gray-700">{currentRoom.id.slice(0, 10)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Members</span>
          <span className="text-gray-700">{currentRoom.users.length}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Objects</span>
          <span className="text-gray-700">{currentRoom.objectCount}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Privacy</span>
          <span className="text-gray-700">
            {currentRoom.isPrivate ? '🔒 Private' : '🌐 Public'}
          </span>
        </div>
      </div>

      {currentRoom.users.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Members</p>
          <div className="flex flex-wrap gap-2">
            {currentRoom.users.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="text-gray-700">{user.username}</span>
                {user.role === 'owner' && (
                  <span className="text-blue-500 text-[10px]">👑</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
