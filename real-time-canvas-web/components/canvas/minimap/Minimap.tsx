'use client'

/**
 * Minimap Component with Radar Overlay
 * Offers a spatial overview of canvas objects and collaborator locations
 * with quick viewport teleportation.
 */

import { useRef, useState } from 'react'
import { useMinimap } from '@/hooks/useMinimap'
import { useMinimapStore } from '@/store/minimapStore'
import { useCollaborationStore } from '@/store/collaborationStore'
import { Tooltip } from '@/components/ui/Tooltip'

interface MinimapProps {
  className?: string
}

export function Minimap({ className = '' }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const { minimapCanvasRef, isCollapsed, handleMinimapClick } = useMinimap()
  const { toggleCollapse, config, setConfig } = useMinimapStore()
  const { userCount } = useCollaborationStore()

  const handleResize = () => {
    // Cycle through preset dimensions
    const sizes = [
      { width: 180, height: 125 },
      { width: 220, height: 150 },
      { width: 260, height: 180 },
      { width: 300, height: 210 },
    ]
    const currentIndex = sizes.findIndex(
      (s) => s.width === config.width && s.height === config.height
    )
    const nextIndex = (currentIndex + 1) % sizes.length
    setConfig({
      width: sizes[nextIndex].width,
      height: sizes[nextIndex].height,
    })
  }

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="rounded-2xl shadow-2xl border border-slate-300/60 dark:border-slate-700/60 overflow-hidden bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl">
        {/* Radar Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-sm shadow-cyan-500/50" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wider uppercase">
              Radar
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/60">
              {userCount} {userCount === 1 ? 'user' : 'users'}
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1">
            <Tooltip label="Resize minimap">
              <button
                onClick={handleResize}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                aria-label="Resize minimap"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label={isCollapsed ? 'Expand minimap' : 'Collapse minimap'}>
              <button
                onClick={toggleCollapse}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                aria-label={isCollapsed ? 'Expand minimap' : 'Collapse minimap'}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isCollapsed ? 'rotate-180' : 'rotate-0'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Minimap Viewport Canvas */}
        {!isCollapsed && (
          <>
            <div
              className="relative cursor-crosshair overflow-hidden group/canvas"
              style={{
                width: config.width,
                height: config.height,
                backgroundColor: config.backgroundColor || '#0b0f19',
              }}
            >
              <canvas
                ref={minimapCanvasRef}
                width={config.width}
                height={config.height}
                onClick={handleMinimapClick}
                className="w-full h-full block"
              />

              {/* Radar Sweep Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                <div className="w-full h-[200%] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-radar-scan" />
              </div>

              {/* Hover Navigation Hint */}
              {isHovered && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-100/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 text-[10px] px-2.5 py-0.5 rounded-full border border-slate-300/60 dark:border-slate-700/60 shadow-lg backdrop-blur-md pointer-events-none font-medium">
                  Click to teleport
                </div>
              )}
            </div>

            {/* Radar Footer / Legend */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                  <span>You</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  <span>Others</span>
                </div>
              </div>
              <div className="text-slate-500 dark:text-slate-500 text-[10px]">
                {config.scale ? config.scale.toFixed(1) : '1.0'}x
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}