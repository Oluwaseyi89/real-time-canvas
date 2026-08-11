'use client'

/**
 * Zoom Controls Component
 * Provides floating viewport navigation: zoom level indicator, preset selection menu,
 * step-wise zooming, and fit-to-view action.
 */

import React, { useState, useRef, useEffect } from 'react'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFitToView: () => void
  onSetZoom?: (targetZoom: number) => void
  className?: string
}

const PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToView,
  onSetZoom,
  className = '',
}: ZoomControlsProps) {
  const [showPresets, setShowPresets] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const zoomPercentage = Math.round(zoom * 100)

  // Close preset popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowPresets(false)
      }
    }

    if (showPresets) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPresets])

  const handleSelectPreset = (presetValue: number) => {
    if (presetValue === 1.0) {
      onReset()
    } else if (onSetZoom) {
      onSetZoom(presetValue)
    }
    setShowPresets(false)
  }

  return (
    <div
      ref={menuRef}
      className={`relative flex items-center gap-1.5 select-none ${className}`}
      role="group"
      aria-label="Zoom controls"
    >
      {/* Zoom Presets Popover */}
      {showPresets && (
        <div className="absolute bottom-14 right-0 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md shadow-2xl flex flex-col min-w-[130px] animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
            Presets
          </div>
          {PRESETS.map((preset) => {
            const presetPercent = Math.round(preset * 100)
            const isSelected = presetPercent === zoomPercentage
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1.5 text-xs font-mono text-left hover:bg-slate-800/80 transition-colors flex items-center justify-between ${
                  isSelected ? 'text-indigo-400 font-bold bg-indigo-500/10' : 'text-slate-300'
                }`}
              >
                <span>{presetPercent}%</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            )}
          )}
          <div className="border-t border-slate-800/80 my-1" />
          <button
            type="button"
            onClick={() => {
              onFitToView()
              setShowPresets(false)
            }}
            className="px-3 py-1.5 text-xs text-left text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            Fit to Content
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="p-1 rounded-2xl flex items-center gap-1 shadow-xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md">
        {/* Zoom Out */}
        <button
          type="button"
          onClick={onZoomOut}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all active:scale-95"
          aria-label="Zoom out"
          title="Zoom out (-)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Zoom Percentage Trigger */}
        <button
          type="button"
          onClick={() => setShowPresets((prev) => !prev)}
          className="px-2.5 py-1 text-xs font-mono font-bold text-slate-200 hover:text-indigo-400 hover:bg-slate-800/60 rounded-lg transition-all"
          aria-label={`Current zoom ${zoomPercentage}%. Click for presets.`}
          title="Click for zoom presets"
        >
          {zoomPercentage}%
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={onZoomIn}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all active:scale-95"
          aria-label="Zoom in"
          title="Zoom in (+)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-0.5" role="separator" />

        {/* Fit to View */}
        <button
          type="button"
          onClick={onFitToView}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all active:scale-95"
          aria-label="Fit to view"
          title="Fit all objects to view (Shift + 1)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}