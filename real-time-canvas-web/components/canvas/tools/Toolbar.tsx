'use client'

import { useState, useEffect } from 'react'
import { TextTool } from './TextTool'
import { ShapeTool } from './ShapeTool'
import { PencilTool } from './PencilTool'
import { ImageTool } from './ImageTool'
import { StickyNoteTool } from './StickyNoteTool'
import { AudioTool } from './AudioTool'
import { Tooltip } from '@/components/ui/Tooltip'

export type ToolType = 'text' | 'shape' | 'pencil' | 'image' | 'sticky' | 'audio' | null

interface ToolDefinition {
  type: ToolType
  label: string
  shortcut: string
  icon: (active: boolean) => React.ReactNode
}

const TOOLS: ToolDefinition[] = [
  {
    type: 'text',
    label: 'Text',
    shortcut: 'T',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M4 6h16M12 6v14" />
      </svg>
    ),
  },
  {
    type: 'shape',
    label: 'Shapes',
    shortcut: 'S',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
      </svg>
    ),
  },
  {
    type: 'pencil',
    label: 'Pencil',
    shortcut: 'P',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    type: 'image',
    label: 'Image',
    shortcut: 'I',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'sticky',
    label: 'Sticky Note',
    shortcut: 'N',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    type: 'audio',
    label: 'Audio Note',
    shortcut: 'R',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
]

interface ToolbarProps {
  className?: string
  roomId: string
}

export function Toolbar({ className = '', roomId }: ToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null)

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === 'Escape') {
        setActiveTool(null)
        return
      }

      const foundTool = TOOLS.find((tool) => tool.shortcut.toLowerCase() === e.key.toLowerCase())
      if (foundTool) {
        e.preventDefault()
        setActiveTool((prev) => (prev === foundTool.type ? null : foundTool.type))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleTool = (toolType: ToolType) => {
    setActiveTool((prev) => (prev === toolType ? null : toolType))
  }

  const handleToolAdded = () => {
    setActiveTool(null)
  }

  const renderToolPanel = () => {
    switch (activeTool) {
      case 'text':
        return <TextTool onAddText={handleToolAdded} />
      case 'shape':
        // Unlike the other tools, the shape tool stays open after placing a
        // shape (draw or tap, both handled by useCanvas.ts) so the user can
        // place several in a row — no onAddShape/auto-close here.
        return <ShapeTool />
      case 'pencil':
        // Same reasoning as shape: stays open across strokes instead of
        // closing after one.
        return <PencilTool />
      case 'image':
        return <ImageTool roomId={roomId} onAddImage={handleToolAdded} />
      case 'sticky':
        return <StickyNoteTool onAddSticky={handleToolAdded} />
      case 'audio':
        return <AudioTool roomId={roomId} onAddAudio={handleToolAdded} />
      default:
        return null
    }
  }

  return (
    <div className={`flex flex-col items-center gap-3 transition-all duration-200 ${className}`}>
      {/* Active Sub-Tool Popover Panel */}
      {activeTool && (
        <div className="glass-panel p-3 rounded-2xl border border-slate-300/60 dark:border-slate-700/60 shadow-2xl backdrop-blur-xl animate-slide-in-bottom">
          {renderToolPanel()}
        </div>
      )}

      {/* Main Glassmorphic Dock */}
      <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl border border-slate-300/60 dark:border-slate-700/60 backdrop-blur-xl">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.type
          return (
            <Tooltip key={tool.type} label={tool.label} shortcut={tool.shortcut}>
              <button
                onClick={() => toggleTool(tool.type)}
                className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
                aria-label={`${tool.label} tool (${tool.shortcut})`}
              >
                {tool.icon(isActive)}

                {/* Active state indicator dot */}
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-white shadow-sm" />
                )}
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}