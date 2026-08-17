/**
 * Shared hover tooltip. Extracted from the toolbar's tool buttons — the one
 * place in the app with a real, polished hover tooltip (label + optional
 * shortcut badge, fades in above the trigger) — so every other icon-only
 * button (zoom controls, minimap, time travel playback) can share the exact
 * same look instead of falling back to a bare native `title` attribute.
 */

import { ReactNode } from 'react'

interface TooltipProps {
  label: string
  shortcut?: string
  children: ReactNode
  className?: string
  /** Which side of the trigger the tooltip floats on. Defaults to 'top'. */
  side?: 'top' | 'right'
}

export function Tooltip({ label, shortcut, children, className = '', side = 'top' }: TooltipProps) {
  const positionClasses =
    side === 'right'
      ? 'top-1/2 -translate-y-1/2 left-[calc(100%+0.5rem)]'
      : '-top-10 left-1/2 -translate-x-1/2'

  return (
    <span className={`relative group inline-flex ${className}`}>
      {children}
      <span className={`absolute ${positionClasses} opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50`}>
        <span className="bg-slate-100/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-300/70 dark:border-slate-700/70 shadow-xl whitespace-nowrap flex items-center gap-1.5">
          <span>{label}</span>
          {shortcut && (
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded border border-slate-300 dark:border-slate-700">
              {shortcut}
            </span>
          )}
        </span>
      </span>
    </span>
  )
}
