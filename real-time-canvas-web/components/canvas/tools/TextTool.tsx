'use client'

/**
 * Text tool component for adding text objects to canvas
 */

import { useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface TextToolProps {
  onAddText?: (text: string) => void
}

export function TextTool({ onAddText }: TextToolProps) {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const { addText } = useCanvas()

  const handleAddText = () => {
    if (!text.trim()) return
    const obj = addText(text, { fontSize })
    if (obj) {
      onAddText?.(text)
      setText('')
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow border border-border-light">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
      />
      <input
        type="number"
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        min={8}
        max={72}
        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleAddText}
        disabled={!text.trim()}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </div>
  )
}
