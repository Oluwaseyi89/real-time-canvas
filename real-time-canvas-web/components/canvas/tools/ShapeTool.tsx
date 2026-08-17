'use client'

/**
 * Shape tool: pick a shape type here, then either click-drag directly on
 * the canvas to draw it at whatever size/position you want, or tap once
 * for a default-sized shape at that point — both go through useCanvas.ts's
 * mouse handlers via drawingStore, not through this component. Fill/
 * outline colors come from the same store, set by the color palette dock
 * (right edge) rather than a picker embedded here, so both stay in sync.
 */

import { useEffect, useState } from 'react'
import { useDrawingStore } from '@/store/drawingStore'

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

export function ShapeTool() {
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rect')
  const { shapeFillColor, shapeStrokeColor, setDrawingShapeType } = useDrawingStore()

  // Arms canvas drawing for as long as this panel is open — cleared on
  // unmount (panel closed / different tool picked) so a stray click
  // elsewhere on the canvas doesn't start drawing a shape nobody asked for.
  useEffect(() => {
    setDrawingShapeType(selectedShape)
    return () => setDrawingShapeType(null)
  }, [selectedShape, setDrawingShapeType])

  return (
    <div className="flex flex-col gap-2 p-1">
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

        {/* Current fill/outline preview — the color palette dock (right
            edge) is what actually changes these. */}
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80">
          <span
            className="w-4 h-4 rounded-full border border-slate-300/60 dark:border-slate-700/60"
            style={{ backgroundColor: shapeFillColor }}
            title={`Fill ${shapeFillColor}`}
          />
          <span
            className="w-4 h-4 rounded-full border-2"
            style={{ borderColor: shapeStrokeColor, backgroundColor: 'transparent' }}
            title={`Outline ${shapeStrokeColor}`}
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-500 px-1">
        Click-drag on the canvas to draw, or tap for a default size.
      </p>
    </div>
  )
}
