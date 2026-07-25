/**
 * Zoom controls component for the canvas
 * Provides zoom in, zoom out, reset, and fit to view buttons
 */

import React from 'react'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFitToView: () => void
  className?: string
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToView,
  className = '',
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoom * 100)

  return (
    <div
      className={`flex items-center gap-1 bg-white rounded-lg shadow-lg border border-border-light p-1 ${className}`}
      role="group"
      aria-label="Zoom controls"
    >
      <button
        onClick={onZoomOut}
        className="toolbar-button w-8 h-8 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div
        className="min-w-[48px] text-center text-sm font-medium text-gray-700 cursor-default"
        onClick={onReset}
        role="button"
        tabIndex={0}
        aria-label="Reset zoom"
        title="Reset zoom (click)"
      >
        {zoomPercentage}%
      </div>

      <button
        onClick={onZoomIn}
        className="toolbar-button w-8 h-8 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" role="separator" />

      <button
        onClick={onFitToView}
        className="toolbar-button w-8 h-8 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Fit to view"
        title="Fit all objects to view"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      </button>
    </div>
  )
}
