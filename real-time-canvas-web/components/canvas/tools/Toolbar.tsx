'use client'

import { useState, useEffect } from 'react'
import { TextTool } from './TextTool'
import { ShapeTool } from './ShapeTool'
import { ImageTool } from './ImageTool'
import { StickyNoteTool } from './StickyNoteTool'
import { AudioTool } from './AudioTool'

export type ToolType = 'text' | 'shape' | 'image' | 'sticky' | 'audio' | null

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
}

export function Toolbar({ className = '' }: ToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null)
  const [isOpen, setIsOpen] = useState(true)

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
        return <ShapeTool onAddShape={handleToolAdded} />
      case 'image':
        return <ImageTool onAddImage={handleToolAdded} />
      case 'sticky':
        return <StickyNoteTool onAddSticky={handleToolAdded} />
      case 'audio':
        return <AudioTool onAddAudio={handleToolAdded} />
      default:
        return null
    }
  }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 transition-all duration-200 ${className}`}>
      {/* Active Sub-Tool Popover Panel */}
      {activeTool && (
        <div className="glass-panel p-3 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          {renderToolPanel()}
        </div>
      )}

      {/* Main Glassmorphic Dock */}
      <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl border border-slate-700/60 backdrop-blur-xl">
        {/* Expand / Collapse Toggle Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen)
            if (isOpen) setActiveTool(null)
          }}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all active:scale-95"
          title={isOpen ? 'Collapse toolbar' : 'Expand toolbar'}
          aria-label={isOpen ? 'Collapse toolbar' : 'Expand toolbar'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="w-[1px] h-5 bg-slate-800/80 mx-1" role="separator" />

            {/* Tool Action Buttons */}
            <div className="flex items-center gap-1">
              {TOOLS.map((tool) => {
                const isActive = activeTool === tool.type
                return (
                  <button
                    key={tool.type}
                    onClick={() => toggleTool(tool.type)}
                    className={`relative p-2.5 rounded-xl transition-all group flex items-center justify-center active:scale-95 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                    aria-label={`${tool.label} tool (${tool.shortcut})`}
                  >
                    {tool.icon(isActive)}

                    {/* Active state indicator dot */}
                    {isActive && (
                      <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-white shadow-sm" />
                    )}

                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                      <div className="bg-slate-900/95 text-slate-200 text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-700/70 shadow-xl whitespace-nowrap flex items-center gap-1.5">
                        <span>{tool.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1 rounded border border-slate-700">
                          {tool.shortcut}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}