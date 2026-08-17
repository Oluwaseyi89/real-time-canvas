'use client'

/**
 * Positions whichever dock panel is currently open next to the dock rail,
 * and closes it on outside-click or Escape. One shared flyout slot rather
 * than per-feature positioning means every docked panel behaves the same
 * way regardless of which corner its old standalone layout used to live in.
 */

import { useEffect, useRef } from 'react'

interface DockFlyoutProps {
  isOpen: boolean
  onClose: () => void
  anchorClassName?: string
  children: React.ReactNode
}

export function DockFlyout({ isOpen, onClose, anchorClassName = '', children }: DockFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      // Clicks on the dock rail itself (including re-clicking the button
      // that opened this panel) are handled by the dock's own onClick
      // toggle logic — treating them as "outside" here too would race with
      // that toggle and immediately reopen a panel the user just closed.
      if (target.closest('[data-dock-root]')) return
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className={`fixed z-40 animate-slide-in-right max-h-[calc(100vh-2rem)] overflow-y-auto ${anchorClassName}`}
    >
      {children}
    </div>
  )
}
