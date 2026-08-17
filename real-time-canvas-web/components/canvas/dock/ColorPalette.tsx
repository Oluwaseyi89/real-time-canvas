'use client'

/**
 * Fill/outline color palette for the shape tool, docked at the right edge.
 * Two ways to target fill vs outline, so it works equally well with a
 * mouse or a thumb:
 *  - Mode tabs (Fill/Outline) at the top: tap a tab, then tap any swatch —
 *    the only option on touch devices, since there's no right-click there.
 *  - Left/right-click on desktop: left-click a swatch applies to whichever
 *    mode is currently selected; right-click always applies to Outline
 *    regardless of the selected mode, as a quick shortcut that skips
 *    switching tabs.
 */

import { useState } from 'react'
import { useDrawingStore } from '@/store/drawingStore'

type ColorMode = 'fill' | 'outline'

const SWATCHES = [
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#64748b', // Slate
  '#0f172a', // Near-black
  '#ffffff', // White
  'transparent',
]

export function ColorPalette() {
  const { shapeFillColor, shapeStrokeColor, setShapeFillColor, setShapeStrokeColor } = useDrawingStore()
  const [mode, setMode] = useState<ColorMode>('fill')

  const applyColor = (color: string, target: ColorMode) => {
    if (target === 'fill') setShapeFillColor(color)
    else setShapeStrokeColor(color)
  }

  const handleSwatchClick = (color: string) => applyColor(color, mode)
  const handleSwatchContextMenu = (e: React.MouseEvent, color: string) => {
    e.preventDefault()
    applyColor(color, 'outline')
  }

  return (
    <div className="w-64 bg-slate-50/90 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl select-none">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Colors</h4>
        <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">
          right-click = outline
        </span>
      </div>

      {/* Mode tabs — primary interaction on touch, a same-tab alternative
          to right-click on desktop. */}
      <div className="flex items-center gap-1 p-1 mb-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/60 dark:border-slate-700/60">
        {(['fill', 'outline'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              mode === m
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${m === 'outline' ? 'border-2 bg-transparent' : 'border'} border-current`}
              style={{
                backgroundColor: m === 'fill' ? shapeFillColor : 'transparent',
                borderColor: m === 'outline' ? shapeStrokeColor : 'rgba(148,163,184,0.5)',
              }}
            />
            {m}
          </button>
        ))}
      </div>

      {/* Swatch grid */}
      <div className="grid grid-cols-6 gap-2">
        {SWATCHES.map((color) => {
          const isActive = mode === 'fill' ? shapeFillColor === color : shapeStrokeColor === color
          return (
            <button
              key={color}
              type="button"
              onClick={() => handleSwatchClick(color)}
              onContextMenu={(e) => handleSwatchContextMenu(e, color)}
              className={`w-full aspect-square rounded-lg border transition-transform ${
                isActive
                  ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 scale-105'
                  : 'border-slate-300/60 dark:border-slate-700/60 hover:scale-110'
              } ${color === 'transparent' ? 'bg-[conic-gradient(#94a3b8_90deg,transparent_90deg_180deg,#94a3b8_180deg_270deg,transparent_270deg)] bg-[length:8px_8px]' : ''}`}
              style={color === 'transparent' ? undefined : { backgroundColor: color }}
              aria-label={`${color} — left-click sets ${mode}, right-click sets outline`}
              title={color}
            />
          )
        })}
      </div>

      {/* Custom pickers for both, always visible regardless of mode */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
        <label className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80 cursor-pointer">
          <span className="relative w-5 h-5 rounded-md overflow-hidden border border-slate-300/60 dark:border-slate-700/60 flex-shrink-0">
            <input
              type="color"
              value={shapeFillColor === 'transparent' ? '#3b82f6' : shapeFillColor}
              onChange={(e) => setShapeFillColor(e.target.value)}
              className="absolute -inset-2 w-9 h-9 opacity-0 cursor-pointer"
            />
            <span className="absolute inset-0" style={{ backgroundColor: shapeFillColor }} />
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Fill</span>
        </label>

        <label className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-700/80 cursor-pointer">
          <span className="relative w-5 h-5 rounded-md overflow-hidden border border-slate-300/60 dark:border-slate-700/60 flex-shrink-0">
            <input
              type="color"
              value={shapeStrokeColor === 'transparent' ? '#2563eb' : shapeStrokeColor}
              onChange={(e) => setShapeStrokeColor(e.target.value)}
              className="absolute -inset-2 w-9 h-9 opacity-0 cursor-pointer"
            />
            <span className="absolute inset-0" style={{ backgroundColor: shapeStrokeColor }} />
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Outline</span>
        </label>
      </div>
    </div>
  )
}
