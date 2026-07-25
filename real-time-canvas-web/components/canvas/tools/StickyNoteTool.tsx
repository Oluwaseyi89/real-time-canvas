'use client'

/**
 * Sticky note tool component for adding sticky notes to canvas
 */

import { useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface StickyNoteToolProps {
  onAddSticky?: (text: string) => void
}

const COLORS = [
  { name: 'Yellow', value: '#fef3c7', stroke: '#f59e0b' },
  { name: 'Blue', value: '#dbeafe', stroke: '#3b82f6' },
  { name: 'Green', value: '#d1fae5', stroke: '#10b981' },
  { name: 'Pink', value: '#fce7f3', stroke: '#ec4899' },
  { name: 'Purple', value: '#ede9fe', stroke: '#8b5cf6' },
  { name: 'Orange', value: '#ffedd5', stroke: '#f97316' },
]

export function StickyNoteTool({ onAddSticky }: StickyNoteToolProps) {
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const { addStickyNote } = useCanvas()

  const handleAddSticky = () => {
    if (!text.trim()) return
    const obj = addStickyNote(text, {
      fill: selectedColor.value,
      stroke: selectedColor.stroke,
    })
    if (obj) {
      onAddSticky?.(text)
      setText('')
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-white rounded-lg shadow border border-border-light min-w-[280px]">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter note text..."
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAddSticky()}
        />
        <button
          onClick={handleAddSticky}
          disabled={!text.trim()}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Note
        </button>
      </div>

      <div className="flex gap-1 items-center">
        <span className="text-xs text-gray-500 mr-1">Color:</span>
        {COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => setSelectedColor(color)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              selectedColor.value === color.value
                ? 'border-blue-500 scale-110'
                : 'border-gray-300 hover:scale-105'
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
    </div>
  )
}
