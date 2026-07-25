'use client'

/**
 * Main toolbar component that provides access to all canvas tools
 * Organized as a floating toolbar with expandable tool panels
 */

import { useState } from 'react'
import { TextTool } from './TextTool'
import { ShapeTool } from './ShapeTool'
import { ImageTool } from './ImageTool'
import { StickyNoteTool } from './StickyNoteTool'
import { AudioTool } from './AudioTool'

type ToolType = 'text' | 'shape' | 'image' | 'sticky' | 'audio' | null

const TOOLS: { type: ToolType; label: string; icon: string; color?: string }[] = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'shape', label: 'Shape', icon: '▭' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'sticky', label: 'Sticky Note', icon: '📝' },
  { type: 'audio', label: 'Audio', icon: '🎙️' },
]

interface ToolbarProps {
  className?: string
}

export function Toolbar({ className = '' }: ToolbarProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null)
  const [isOpen, setIsOpen] = useState(true)

  const toggleTool = (toolType: ToolType) => {
    if (activeTool === toolType) {
      setActiveTool(null)
    } else {
      setActiveTool(toolType)
    }
  }

  const renderToolPanel = () => {
    switch (activeTool) {
      case 'text':
        return <TextTool onAddText={() => setActiveTool(null)} />
      case 'shape':
        return <ShapeTool onAddShape={() => setActiveTool(null)} />
      case 'image':
        return <ImageTool onAddImage={() => setActiveTool(null)} />
      case 'sticky':
        return <StickyNoteTool onAddSticky={() => setActiveTool(null)} />
      case 'audio':
        return <AudioTool onAddAudio={() => setActiveTool(null)} />
      default:
        return null
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Toolbar buttons */}
      <div className="flex items-center gap-1 bg-white rounded-lg shadow-lg border border-border-light p-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="toolbar-button w-8 h-8 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
          title={isOpen ? 'Collapse toolbar' : 'Expand toolbar'}
        >
          <span className="text-sm">{isOpen ? '◀' : '▶'}</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" role="separator" />

        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            onClick={() => toggleTool(tool.type)}
            className={`toolbar-button w-10 h-10 rounded-md transition-colors ${
              activeTool === tool.type
                ? 'bg-blue-100 text-blue-600 border-2 border-blue-500'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={tool.label}
          >
            <span className="text-lg">{tool.icon}</span>
          </button>
        ))}
      </div>

      {/* Active tool panel */}
      {activeTool && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          {renderToolPanel()}
        </div>
      )}
    </div>
  )
}
