'use client'

/**
 * Positions whichever dock panel is currently open, and lets the user
 * relocate it anywhere on screen by dragging its grip handle — useful when
 * the default spot (next to the dock, or wherever cornerClassName puts it)
 * sits over the part of the canvas they're working on. Closes on:
 * re-clicking its rail icon (handled by the dock itself), the panel's own
 * close button, and — unless disabled via props, for panels meant to stay
 * open as persistent monitors — outside-click or Escape.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface DockFlyoutProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  /**
   * Tailwind position classes for where this panel starts before it's ever
   * been dragged (e.g. "left-24 top-4" to sit beside the left dock, or
   * "bottom-4 right-4" to dock to that corner). Defaults to the classic
   * spot next to the left dock.
   */
  cornerClassName?: string
  /** Set false for panels meant to stay open regardless of other clicks. */
  closeOnOutsideClick?: boolean
  /** Set false for panels meant to stay open regardless of other clicks. */
  closeOnEscape?: boolean
}

const DEFAULT_CORNER_CLASSNAME = 'left-24 top-4'
const EDGE_MARGIN = 8

export function DockFlyout({
  isOpen,
  onClose,
  children,
  cornerClassName = DEFAULT_CORNER_CLASSNAME,
  closeOnOutsideClick = true,
  closeOnEscape = true,
}: DockFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // null = not yet dragged this time it's open; render via cornerClassName.
  // Once dragged, explicit pixel coordinates take over.
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOriginRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    if (isOpen) setDragPosition(null)
  }, [isOpen])

  const clampPosition = useCallback((x: number, y: number) => {
    const el = panelRef.current
    const width = el?.offsetWidth ?? 300
    const height = el?.offsetHeight ?? 200
    const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN)
    const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN)
    return {
      x: Math.min(Math.max(x, EDGE_MARGIN), maxX),
      y: Math.min(Math.max(y, EDGE_MARGIN), maxY),
    }
  }, [])

  // Pointer capture (rather than attaching move/up listeners to window from
  // an effect keyed on isDragging) keeps every subsequent event routed to
  // this same button regardless of where the cursor ends up, and does so
  // synchronously in the same handler that starts the drag — no gap where
  // a fast move+up could land before a separately-scheduled effect finishes
  // attaching its listeners.
  const handleGripPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      // First drag from the corner-class default: seed the origin from
      // where the panel is actually rendered right now, since dragPosition
      // itself is still null at this point.
      const origin = dragPosition ?? panelRef.current?.getBoundingClientRect() ?? { x: 0, y: 0 }
      dragOriginRef.current = { startX: e.clientX, startY: e.clientY, originX: origin.x, originY: origin.y }
      setIsDragging(true)
    },
    [dragPosition]
  )

  const handleGripPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const origin = dragOriginRef.current
      if (!origin) return
      setDragPosition(clampPosition(origin.originX + (e.clientX - origin.startX), origin.originY + (e.clientY - origin.startY)))
    },
    [clampPosition]
  )

  const handleGripPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragOriginRef.current = null
    setIsDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  useEffect(() => {
    if (!isOpen || (!closeOnOutsideClick && !closeOnEscape)) return

    const handlePointerDown = (e: PointerEvent) => {
      if (!closeOnOutsideClick) return
      const target = e.target as HTMLElement
      // Clicks on the dock rail itself (including re-clicking the button
      // that opened this panel) are handled by the dock's own onClick
      // toggle logic — treating them as "outside" here too would race with
      // that toggle and immediately reopen a panel the user just closed.
      if (target.closest('[data-dock-root]')) return
      // Clicks on the canvas itself are a real interaction (drawing a
      // shape, selecting/moving an object), not a "dismiss this panel"
      // gesture — closing here raced with the shape tool specifically:
      // `pointerdown` fires before Fabric's own `mousedown`, so closing
      // (and unmounting the Shape tool) on this same click cleared
      // drawingShapeType before useCanvas.ts's mousedown handler ever saw
      // it, silently swallowing the click instead of drawing anything.
      if (target.closest('[data-canvas-root]')) return
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, closeOnOutsideClick, closeOnEscape])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      style={dragPosition ? { left: dragPosition.x, top: dragPosition.y } : undefined}
      className={`fixed z-40 flex flex-col gap-1.5 ${dragPosition ? '' : cornerClassName} ${isDragging ? '' : 'animate-slide-in-right'}`}
    >
      {/* Grip (drag anywhere on screen) + close — floats above the panel's
          own content so it works the same regardless of what that content
          is or how it's styled internally. */}
      <div className="flex items-center gap-1 self-start">
        <button
          type="button"
          onPointerDown={handleGripPointerDown}
          onPointerMove={handleGripPointerMove}
          onPointerUp={handleGripPointerUp}
          onPointerCancel={handleGripPointerUp}
          draggable={false}
          className={`p-1.5 rounded-lg bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shadow-lg backdrop-blur-md touch-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          title="Drag to move"
          aria-label="Drag to move panel"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="6" cy="5" r="1.4" />
            <circle cx="14" cy="5" r="1.4" />
            <circle cx="6" cy="10" r="1.4" />
            <circle cx="14" cy="10" r="1.4" />
            <circle cx="6" cy="15" r="1.4" />
            <circle cx="14" cy="15" r="1.4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 shadow-lg backdrop-blur-md transition-colors"
          title="Close panel"
          aria-label="Close panel"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">{children}</div>
    </div>
  )
}
