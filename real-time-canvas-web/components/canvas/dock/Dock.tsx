'use client'

/**
 * Unified left-edge icon dock. Replaces the old scattered always-on
 * clusters (toolbar, minimap, zoom, time travel, presence, etc. each
 * floating in their own corner) with a single rail of icon triggers —
 * every feature panel stays docked/collapsed until the user explicitly
 * clicks it open, and only one panel is open at a time.
 */

import { Tooltip } from '@/components/ui/Tooltip'
import { useTheme } from '@/lib/theme/ThemeProvider'
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
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a4 4 0 100 8 4 4 0 000-8zM3 20c0-3.314 3.582-6 8-6s8 2.686 8 6M16 8l4-4m0 0l-2.5 2.5M20 4l-2.5 2.5" />
      </svg>
    ),
  },
  {
    id: 'radar',
    label: 'Radar',
    icon: (
      <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.782V8.018a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
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
  className?: string
}

export function Dock({
  activePanel,
  onTogglePanel,
  onOpenExport,
  isConnected,
  physicsEnabled,
  userCount,
  className = '',
}: DockProps) {
  const { theme, toggleTheme } = useTheme()

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
      {TOP_ITEMS.map((item) =>
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

      <Tooltip label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} side="right">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all flex items-center justify-center active:scale-95"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className={ICON_CLASS} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </Tooltip>
    </div>
  )
}
