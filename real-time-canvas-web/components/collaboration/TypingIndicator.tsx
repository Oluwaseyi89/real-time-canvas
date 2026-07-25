'use client'

/**
 * Typing indicator component
 * Shows which users are currently typing
 */

import { useEffect, useState } from 'react'
import { useCollaborationStore } from '@/store/collaborationStore'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  const { users, typingUsers } = useCollaborationStore()
  const [typingNames, setTypingNames] = useState<string[]>([])

  useEffect(() => {
    const names = typingUsers
      .map(id => users.get(id)?.username)
      .filter((name): name is string => !!name)
    setTypingNames(names)
  }, [typingUsers, users])

  if (typingNames.length === 0) return null

  const message = typingNames.length === 1
    ? `${typingNames[0]} is typing...`
    : typingNames.length === 2
      ? `${typingNames[0]} and ${typingNames[1]} are typing...`
      : `${typingNames.length} people are typing...`

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <span className="animate-pulse">✏️</span>
      <span>{message}</span>
    </div>
  )
}
