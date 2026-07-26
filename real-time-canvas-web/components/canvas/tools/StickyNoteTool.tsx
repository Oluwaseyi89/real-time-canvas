'use client'

/**
 * Sticky Note Tool Component
 * Allows users to type text, choose a color preset, and place a sticky note onto the canvas.
 */

import { useState, KeyboardEvent } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface StickyNoteColor {
  name: string
  value: string
  stroke: string
}

interface StickyNoteToolProps {
  onAddSticky?: (text: string, color: StickyNoteColor) => void
}

const COLORS: StickyNoteColor[] = [
  { name: 'Yellow', value: '#FEF3C7', stroke: '#F59E0B' },
  { name: 'Blue', value: '#DBEAFE', stroke: '#3B82F6' },
  { name: 'Green', value: '#D1FAE5', stroke: '#10B981' },
  { name: 'Pink', value: '#FCE7F3', stroke: '#EC4899' },
  { name: 'Purple', value: '#EDE9FE', stroke: '#8B5CF6' },
  { name: 'Orange', value: '#FFEDD5', stroke: '#F97316' },
]

export function StickyNoteTool({ onAddSticky }: StickyNoteToolProps) {
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState<StickyNoteColor>(COLORS[0])
  const { addStickyNote } = useCanvas()

  const handleAddSticky = () => {
    const trimmedText = text.trim()
    if (!trimmedText) return

    const obj = addStickyNote(trimmedText, {
      fill: selectedColor.value,
      stroke: selectedColor.stroke,
    })

    if (obj) {
      onAddSticky?.(trimmedText, selectedColor)
      setText('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Pressing Enter without Shift submits the sticky note
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddSticky()
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 bg-white rounded-lg shadow-md border border-slate-200 min-w-[280px]">
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a note... (Enter to add, Shift+Enter for new line)"
          rows={3}
          className="w-full px-2.5 py-2 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">Color:</span>
            {COLORS.map((color) => {
              const isSelected = selectedColor.value === color.value
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full border transition-all transform ${
                    isSelected
                      ? 'scale-110 ring-2 ring-blue-500 ring-offset-1 border-transparent'
                      : 'border-slate-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                />
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleAddSticky}
            disabled={!text.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white font-medium rounded-md text-xs hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  )
}