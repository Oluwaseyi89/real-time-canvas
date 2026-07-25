'use client'

/**
 * User presence component
 * Displays active users and their status in the room
 */

import { useCollaborationStore } from '@/store/collaborationStore'

interface UserPresenceProps {
  className?: string
  maxDisplay?: number
}

export function UserPresence({ className = '', maxDisplay = 8 }: UserPresenceProps) {
  const { users, activeUsers, userCount } = useCollaborationStore()
  
  const activeUserList = Array.from(users.values())
    .filter(user => user.isActive)
    .slice(0, maxDisplay)
  
  const remainingCount = userCount - activeUserList.length

  if (userCount === 0) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-400 ${className}`}>
        <span>No users online</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex -space-x-2">
        {activeUserList.map((user) => (
          <div
            key={user.userId}
            className="relative group"
            title={`${user.username}${user.isTyping ? ' (typing...)' : ''}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm"
              style={{ backgroundColor: getUserColor(user.userId) }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-400" />
            {user.isTyping && (
              <span className="absolute -top-1 -right-1">
                <span className="animate-pulse text-xs">✏️</span>
              </span>
            )}
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <span className="text-xs text-gray-500">+{remainingCount} more</span>
      )}

      <span className="text-xs text-gray-400 ml-1">
        {userCount} {userCount === 1 ? 'user' : 'users'}
      </span>
    </div>
  )
}

/**
 * Generate consistent color for a user
 */
function getUserColor(userId: string): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#06b6d4', '#8b5cf6', '#d946ef',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
