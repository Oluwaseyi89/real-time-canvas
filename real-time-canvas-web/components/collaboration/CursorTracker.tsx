'use client'

/**
 * Cursor tracker component for displaying remote user cursors
 */

import { useEffect, useRef } from 'react'
import { useWebSocketStore } from '@/store/websocketStore'

interface CursorTrackerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export function CursorTracker({ canvasRef }: CursorTrackerProps) {
  const { users } = useWebSocketStore()
  const cursorRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    // Create cursor elements for each user
    users.forEach((user) => {
      if (!cursorRefs.current.has(user.userId)) {
        const cursor = document.createElement('div')
        cursor.className = 'absolute pointer-events-none z-50 transition-all duration-100'
        cursor.style.transform = 'translate(-50%, -50%)'
        cursor.innerHTML = `
          <div class="text-sm font-bold px-2 py-1 rounded shadow-lg" 
               style="background-color: ${getUserColor(user.userId)}; color: white;">
            ${user.username}
          </div>
          <div class="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-t-transparent mx-auto"
               style="border-left-color: ${getUserColor(user.userId)}; border-right-color: transparent;"></div>
        `
        container.appendChild(cursor)
        cursorRefs.current.set(user.userId, cursor)
      }

      // Update cursor position
      const cursor = cursorRefs.current.get(user.userId)
      if (cursor && user.cursor) {
        const rect = canvas.getBoundingClientRect()
        const x = (user.cursor.x / canvas.width) * rect.width
        const y = (user.cursor.y / canvas.height) * rect.height
        cursor.style.left = `${x}px`
        cursor.style.top = `${y}px`
        cursor.style.display = 'block'
      }
    })

    // Remove cursors for users that left
    cursorRefs.current.forEach((cursor, userId) => {
      if (!users.has(userId)) {
        cursor.remove()
        cursorRefs.current.delete(userId)
      }
    })

    return () => {
      cursorRefs.current.forEach((cursor) => cursor.remove())
      cursorRefs.current.clear()
    }
  }, [users, canvasRef])

  // Generate consistent color for user
  const getUserColor = (userId: string): string => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return null
}
