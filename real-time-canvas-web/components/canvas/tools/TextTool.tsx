'use client'

/**
 * Text tool component for adding text objects to canvas
 */

import { useState, useRef, useEffect } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface TextToolProps {
  onAddText?: (text: string) => void
}

export function TextTool({ onAddText }: TextToolProps) {
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(24)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addText } = useCanvas()

  // Auto-focus input when the tool popover opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleAddText = () => {
    if (!text.trim()) return
    const obj = addText(text, { fontSize })
    if (obj) {
      onAddText?.(text)
      setText('')
    }
  }

  const fontPresets = [14, 18, 24, 36, 48]

  return (
    <div className="flex flex-col gap-2 p-1">
      {/* Input Row */}
      <div className="flex items-center gap-2">
        {/* Text Input */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your text..."
            className="w-full px-3 py-1.5 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddText()
              }
            }}
          />
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80 rounded-xl px-2 py-1">
          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono select-none">px</span>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Math.max(8, Math.min(144, Number(e.target.value))))}
            min={8}
            max={144}
            className="w-10 bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAddText}
          disabled={!text.trim()}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <span>Add</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Font Size Quick Presets */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase font-semibold mr-1">Presets:</span>
        {fontPresets.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setFontSize(size)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded-md transition-colors ${
              fontSize === size
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  )
}