'use client'

/**
 * Typing Indicator Component
 * Displays dynamic real-time typing notifications with wave animations
 */

import { useCollaborationStore } from '@/store/collaborationStore'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  const { users, typingUsers } = useCollaborationStore()

  // Compute active typing names dynamically without unnecessary state/effects
  const typingNames = typingUsers
    .map((userId) => users.get(userId)?.username || 'Someone')
    .filter(Boolean)

  if (typingNames.length === 0) return null

  // Format natural language text output
  const message =
    typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing`
        : `${typingNames[0]} and ${typingNames.length - 1} others are typing`

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md text-xs text-slate-700 dark:text-slate-300 shadow-md select-none transition-all duration-200 ${className}`}
    >
      {/* Animated Typing Wave Dots */}
      <span className="flex items-center gap-0.5 h-3">
        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
      </span>

      {/* Typing Message Text */}
      <span className="font-medium tracking-wide">{message}</span>
    </div>
  )
}