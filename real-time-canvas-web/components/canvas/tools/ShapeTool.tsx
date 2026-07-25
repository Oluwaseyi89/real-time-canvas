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

const SHAPES: { type: ShapeType; label: string; icon: string; color: string }[] = [
  { type: 'rect', label: 'Rectangle', icon: '▭', color: '#3b82f6' },
  { type: 'circle', label: 'Circle', icon: '●', color: '#ef4444' },
  { type: 'triangle', label: 'Triangle', icon: '▲', color: '#10b981' },
]

export function ShapeTool({ onAddShape }: ShapeToolProps) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rect')
  const [fillColor, setFillColor] = useState('#3b82f6')
  const { addRectangle, addCircle } = useCanvas()

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
        // Triangle support coming soon
        console.warn('Triangle not yet implemented')
        break
    }
    if (obj) {
      onAddShape?.(selectedShape)
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow border border-border-light">
      <div className="flex gap-1">
        {SHAPES.map((shape) => (
          <button
            key={shape.type}
            onClick={() => setSelectedShape(shape.type)}
            className={`w-10 h-10 rounded-md transition-colors ${
              selectedShape === shape.type
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'hover:bg-gray-100'
            }`}
            title={shape.label}
          >
            <span className="text-lg" style={{ color: shape.color }}>
              {shape.icon}
            </span>
          </button>
        ))}
      </div>

      <input
        type="color"
        value={fillColor}
        onChange={(e) => setFillColor(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-300"
        title="Fill color"
      />

      <button
        onClick={handleAddShape}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
      >
        Add Shape
      </button>
    </div>
  )
}
