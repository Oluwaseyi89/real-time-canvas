'use client'

/**
 * Shape tool component for adding shapes to canvas
 */

import { useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface ShapeToolProps {
  onAddShape?: (type: string) => void
}

type ShapeType = 'rect' | 'circle' | 'triangle'

interface ShapeOption {
  type: ShapeType
  label: string
  icon: (active: boolean) => React.ReactNode
}

const SHAPES: ShapeOption[] = [
  {
    type: 'rect',
    label: 'Rectangle',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={active ? 2.5 : 2} />
      </svg>
    ),
  },
  {
    type: 'circle',
    label: 'Circle',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="8" strokeWidth={active ? 2.5 : 2} />
      </svg>
    ),
  },
  {
    type: 'triangle',
    label: 'Triangle',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M12 4l9 16H3L12 4z" />
      </svg>
    ),
  },
]

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
]

export function ShapeTool({ onAddShape }: ShapeToolProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rect')
  const [fillColor, setFillColor] = useState('#6366f1')
  const { addRectangle, addCircle, addTriangle } = useCanvas()

  const handleAddShape = () => {
    let obj = null
    switch (selectedShape) {
      case 'rect':
        obj = addRectangle({ fill: fillColor })
        break
      case 'circle':
        obj = addCircle({ fill: fillColor })
        break
      case 'triangle':
        obj = addTriangle ? addTriangle({ fill: fillColor }) : null
        break
    }
    if (obj) {
      onAddShape?.(selectedShape)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      {/* Top Bar: Shape Selector, Color Picker, Submit */}
      <div className="flex items-center gap-2">
        {/* Shape Buttons */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-300/80 dark:border-slate-700/80">
          {SHAPES.map((shape) => {
            const isActive = selectedShape === shape.type
            return (
              <button
                key={shape.type}
                type="button"
                onClick={() => setSelectedShape(shape.type)}
                className={`p-2 rounded-lg transition-all active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
                title={shape.label}
                aria-label={shape.label}
              >
                {shape.icon(isActive)}
              </button>
            )
          })}
        </div>

        {/* Custom Color Input Wrapper */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden border border-slate-300/80 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-900/80 cursor-pointer group">
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="absolute -inset-2 w-12 h-12 opacity-0 cursor-pointer"
            title="Choose custom color"
          />
          <span
            className="w-5 h-5 rounded-md border border-slate-300/50 dark:border-slate-700/50 transition-transform group-hover:scale-110"
            style={{ backgroundColor: fillColor }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleAddShape}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
        >
          <span>Add Shape</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Bottom Bar: Quick Color Swatches */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold uppercase mr-1">Colors:</span>
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setFillColor(color)}
            className={`w-4 h-4 rounded-full transition-transform ${
              fillColor === color ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110 opacity-80 hover:opacity-100'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  )
}