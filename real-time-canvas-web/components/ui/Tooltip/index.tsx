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
}

export function Tooltip({ label, shortcut, children, className = '' }: TooltipProps) {
  return (
    <span className={`relative group inline-flex ${className}`}>
      {children}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
        <span className="bg-slate-900/95 text-slate-200 text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-700/70 shadow-xl whitespace-nowrap flex items-center gap-1.5">
          <span>{label}</span>
          {shortcut && (
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1 rounded border border-slate-700">
              {shortcut}
            </span>
          )}
        </span>
      </span>
    </span>
  )
}
