'use client'

/**
 * Pencil tool: arms Fabric's own freehand drawing mode for as long as this
 * panel is open (useCanvas.ts mirrors drawingStore.pencilActive onto
 * canvas.isDrawingMode), rather than going through the click-drag shape
 * pipeline ShapeTool uses — freehand strokes are continuous point sampling,
 * not a single start/end drag. Stroke color reuses the same shapeStrokeColor
 * the palette already controls, so switching tools keeps one consistent
 * "current color" instead of a second, disconnected picker.
 */

import { useEffect } from 'react'
import { useDrawingStore } from '@/store/drawingStore'

const WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
]

export function PencilTool() {
  const { shapeStrokeColor, pencilWidth, setPencilActive, setPencilWidth } = useDrawingStore()

  useEffect(() => {
    setPencilActive(true)
    return () => setPencilActive(false)
  }, [setPencilActive])

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-300/80 dark:border-slate-700/80">
          {WIDTHS.map((w) => {
            const isActive = pencilWidth === w.value
            return (
              <button
                key={w.value}
                type="button"
                onClick={() => setPencilWidth(w.value)}
                className={`p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
                title={w.label}
                aria-label={w.label}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: w.value + 2, height: w.value + 2 }}
                />
              </button>
            )
          })}
        </div>

        {/* Current stroke color preview — the color palette dock (right
            edge) is what actually changes this. */}
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80">
          <span
            className="w-4 h-4 rounded-full border border-slate-300/60 dark:border-slate-700/60"
            style={{ backgroundColor: shapeStrokeColor === 'transparent' ? '#1a1a1a' : shapeStrokeColor }}
            title={`Stroke ${shapeStrokeColor}`}
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-500 dark:text-slate-500 px-1">
        Draw freehand directly on the canvas.
      </p>
    </div>
  )
}
