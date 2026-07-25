'use client'

/**
 * Minimap component with radar
 * Shows an overview of the canvas with user positions
 */

import { useRef, useState } from 'react'
import { useMinimap } from '@/hooks/useMinimap'
import { useMinimapStore } from '@/store/minimapStore'
import { useCollaborationStore } from '@/store/collaborationStore'

interface MinimapProps {
  className?: string
}

export function Minimap({ className = '' }: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  const { minimapCanvasRef, isVisible, isCollapsed, handleMinimapClick } = useMinimap()
  const { toggleVisibility, toggleCollapse, config, setConfig } = useMinimapStore()
  const { userCount } = useCollaborationStore()

  if (!isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-20 right-4 z-30 p-2 bg-white rounded-lg shadow-lg border border-border-light hover:bg-gray-50 transition-colors"
        title="Show minimap"
      >
        <span className="text-lg">🗺️</span>
      </button>
    )
  }

  const handleResize = () => {
    // Cycle through preset sizes
    const sizes = [
      { width: 160, height: 120 },
      { width: 200, height: 150 },
      { width: 240, height: 180 },
      { width: 300, height: 220 },
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
      className={`fixed z-30 ${className}`}
      style={{
        bottom: '16px',
        right: '16px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white rounded-lg shadow-xl border border-border-light overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-border-light">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">🗺️ Radar</span>
            <span className="text-xs text-gray-400">{userCount} users</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleResize}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors text-xs"
              title="Resize"
            >
              ↔
            </button>
            <button
              onClick={toggleCollapse}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '◀' : '▼'}
            </button>
            <button
              onClick={toggleVisibility}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="Hide minimap"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Minimap Canvas */}
        {!isCollapsed && (
          <>
            <div 
              className="relative cursor-crosshair"
              style={{ 
                width: config.width, 
                height: config.height,
                backgroundColor: config.backgroundColor,
              }}
            >
              <canvas
                ref={minimapCanvasRef}
                onClick={handleMinimapClick}
                className="w-full h-full"
              />
              
              {/* Hover tooltip */}
              {isHovered && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Click to navigate • Hover for details
                </div>
              )}
            </div>

            {/* Footer / Legend */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-border-light text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>You</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Others</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>Zoom: {config.scale.toFixed(1)}x</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
