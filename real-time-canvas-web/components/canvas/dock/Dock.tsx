'use client'

/**
 * Unified left-edge icon dock. Replaces the old scattered always-on
 * clusters (toolbar, minimap, zoom, time travel, presence, etc. each
 * floating in their own corner) with a single rail of icon triggers —
 * every feature panel stays docked/collapsed until the user explicitly
 * clicks it open, and only one panel is open at a time.
 */

import { Tooltip } from '@/components/ui/Tooltip'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { DockPanelId } from './types'

interface DockItem {
  id: DockPanelId
  label: string
  icon: React.ReactNode
}

const ICON_CLASS = 'w-5 h-5'

const TOP_ITEMS: DockItem[] = [
  {
    id: 'tools',
    label: 'Tools',
    // A pencil reads as "drawing/editing tools" on first sight — the
    // previous icon (a stick figure + wrench-like flourish) didn't map to
    // anything a new user would recognize.
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'zoom',
    label: 'Zoom',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'timeTravel',
    label: 'Time Travel',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'physics',
    label: 'Physics',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
]

const BOTTOM_ITEMS: DockItem[] = [
  {
    id: 'presence',
    label: 'People',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1a4 4 0 100-8 4 4 0 000 8zm6 3v-1a4 4 0 00-3-3.87M7 8a4 4 0 108 0 4 4 0 00-8 0z" />
      </svg>
    ),
  },
  {
    id: 'roomInfo',
    label: 'Room Info',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'invite',
    label: 'Invite',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
      </svg>
    ),
  },
  {
    id: 'diagnostics',
    label: 'Telemetry',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

interface DockProps {
  activePanel: DockPanelId | null
  onTogglePanel: (id: DockPanelId) => void
  onOpenExport: () => void
  isConnected: boolean
  physicsEnabled: boolean
  userCount: number
  // Radar (the minimap) is intentionally NOT part of the single-panel
  // activePanel group above — it stays visible while any other panel is
  // open, for continuous monitoring, so it needs its own independent
  // open/close state and toggle here.
  isRadarOpen: boolean
  onToggleRadar: () => void
  className?: string
}

export function Dock({
  activePanel,
  onTogglePanel,
  onOpenExport,
  isConnected,
  physicsEnabled,
  userCount,
  isRadarOpen,
  onToggleRadar,
  className = '',
}: DockProps) {
  const renderButton = (item: DockItem, badge?: React.ReactNode) => {
    const isActive = activePanel === item.id
    return (
      <Tooltip key={item.id} label={item.label} side="right">
        <button
          type="button"
          onClick={() => onTogglePanel(item.id)}
          className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center active:scale-95 ${
            isActive
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          aria-label={item.label}
          aria-pressed={isActive}
        >
          {item.icon}
          {badge}
        </button>
      </Tooltip>
    )
  }

  return (
    <div
      data-dock-root
      className={`glass-panel flex flex-col items-center gap-1 p-1.5 rounded-2xl shadow-2xl border border-slate-300/60 dark:border-slate-700/60 backdrop-blur-xl ${className}`}
      role="toolbar"
      aria-label="Feature dock"
    >
      {TOP_ITEMS.slice(0, 1).map((item) => renderButton(item))}

      {/* Radar: independent of the single-panel group above, since it stays
          open for monitoring while other panels come and go. */}
      <Tooltip label={isRadarOpen ? 'Hide radar' : 'Show radar'} side="right">
        <button
          type="button"
          onClick={onToggleRadar}
          className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center active:scale-95 ${
            isRadarOpen
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          aria-label={isRadarOpen ? 'Hide radar' : 'Show radar'}
          aria-pressed={isRadarOpen}
        >
          {/* Mini-view-in-a-view — reads as "overview map" more directly
              than the previous folded-paper map icon did. */}
          <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="4" width="18" height="14" rx="2" strokeWidth={2} />
            <rect x="12" y="10" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </Tooltip>

      {TOP_ITEMS.slice(1).map((item) =>
        renderButton(
          item,
          item.id === 'physics' && physicsEnabled ? (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/60" />
          ) : undefined
        )
      )}

      <div className="w-6 h-[1px] bg-slate-300/70 dark:bg-slate-800/80 my-0.5" role="separator" />

      {/* Export: opens a modal directly rather than a dock panel */}
      <Tooltip label="Export" side="right">
        <button
          type="button"
          onClick={onOpenExport}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center active:scale-95"
          aria-label="Export canvas"
        >
          <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </Tooltip>

      {BOTTOM_ITEMS.map((item) =>
        renderButton(
          item,
          item.id === 'presence' && userCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
              {userCount}
            </span>
          ) : item.id === 'diagnostics' ? (
            <span
              className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
          ) : undefined
        )
      )}

      <div className="w-6 h-[1px] bg-slate-300/70 dark:bg-slate-800/80 my-0.5" role="separator" />

      <Tooltip label="Toggle theme" side="right">
        <ThemeToggle />
      </Tooltip>
    </div>
  )
}
