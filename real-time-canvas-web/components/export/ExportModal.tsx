'use client'

/**
 * Export Modal Component
 * Provides a modal dialog for selecting canvas export formats (PNG, SVG, JSON)
 * and configuring quality, scale, background, and metadata settings.
 */

import { useState, useCallback } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useRoom'
import { useExportStore } from '@/store/exportStore'
import { createPNGExporter } from './PNGExporter'
import { createSVGExporter } from './SVGExporter'
import { createJSONExporter } from './JSONExporter'
import type { ExportFormat, ExportOptions } from '@/types/export'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

const FORMAT_CONFIGS: Array<{
  id: ExportFormat
  title: string
  extension: string
  description: string
  icon: string
}> = [
  {
    id: 'png',
    title: 'PNG Image',
    extension: '.png',
    description: 'High-res raster render',
    icon: '🖼️',
  },
  {
    id: 'svg',
    title: 'SVG Vector',
    extension: '.svg',
    description: 'Scalable vector graphics',
    icon: '📐',
  },
  {
    id: 'json',
    title: 'JSON Data',
    extension: '.json',
    description: 'Raw canvas state backup',
    icon: '💾',
  },
]

const QUICK_COLORS = [
  { label: 'Dark Canvas', value: '#0b0f19' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Slate', value: '#1e293b' },
]

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState(1)
  const [quality, setQuality] = useState(1)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeHistory, setIncludeHistory] = useState(false)
  const [filename, setFilename] = useState('canvas-export')
  const [backgroundColor, setBackgroundColor] = useState('#0b0f19')

  const { canvas } = useCanvasStore()
  const { username } = useAuth()
  const { currentRoom } = useRoom()

  // Reactive Zustand state selectors
  const isExporting = useExportStore((s) => s.isExporting)
  const progress = useExportStore((s) => s.progress)
  const error = useExportStore((s) => s.error)
  const setExporting = useExportStore((s) => s.setExporting)
  const setProgress = useExportStore((s) => s.setProgress)
  const setError = useExportStore((s) => s.setError)
  const addToHistory = useExportStore((s) => s.addToHistory)

  const handleExport = useCallback(async () => {
    if (!canvas) {
      setError('Canvas not initialized')
      return
    }

    setExporting(true)
    setProgress(0)
    setError(null)

    try {
      const finalFilename = `${filename}.${format}`
      const exportOptions: ExportOptions = {
        format,
        filename: finalFilename,
        includeMetadata,
        includeHistory,
        quality,
        scale,
        backgroundColor,
      }

      setProgress(15)

      switch (format) {
        case 'png': {
          const exporter = createPNGExporter(canvas)
          await exporter.download(finalFilename, {
            quality,
            scale,
            backgroundColor,
            includeObjects: true,
          })
          break
        }

        case 'svg': {
          const exporter = createSVGExporter(canvas)
          await exporter.download(finalFilename, {
            scale,
            includeMetadata,
            includeStyles: true,
          })
          break
        }

        case 'json': {
          const exporter = createJSONExporter(
            canvas,
            currentRoom?.id || 'unknown',
            'user-id',
            username || 'Guest'
          )
          await exporter.download(finalFilename, {
            includeMetadata,
            includeHistory,
            prettyPrint: true,
            includeVersion: true,
            includeUserData: true,
          })
          break
        }

        default: {
          throw new Error(`Unsupported export format: ${format}`)
        }
      }

      setProgress(100)
      addToHistory({ format, filename: finalFilename })

      // Small delay before closing for smooth completion feedback
      setTimeout(() => {
        onClose()
        setExporting(false)
      }, 400)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)
      setExporting(false)
    }
  }, [
    canvas,
    format,
    filename,
    includeMetadata,
    includeHistory,
    quality,
    scale,
    backgroundColor,
    setExporting,
    setProgress,
    setError,
    addToHistory,
    onClose,
    currentRoom,
    username,
  ])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto text-slate-100 backdrop-blur-xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📤</span>
            <h2 className="text-lg font-bold tracking-wide text-slate-100">
              Export Canvas
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            aria-label="Close export modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Format Selector Cards */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {FORMAT_CONFIGS.map((cfg) => {
                const isSelected = format === cfg.id
                return (
                  <button
                    key={cfg.id}
                    type="button"
                    onClick={() => setFormat(cfg.id)}
                    disabled={isExporting}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <span className="text-2xl mb-1">{cfg.icon}</span>
                    <span className="font-semibold text-xs text-slate-200">
                      {cfg.title}
                    </span>
                    <span className="text-[10px] text-slate-500 text-center mt-0.5">
                      {cfg.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filename Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Filename
            </label>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-indigo-500/80 transition-colors">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="canvas-export"
                disabled={isExporting}
                className="flex-1 bg-transparent text-slate-100 text-xs outline-none placeholder:text-slate-600 font-medium"
              />
              <span className="text-slate-500 font-mono text-[11px] font-semibold">
                .{format}
              </span>
            </div>
          </div>

          {/* Scale Slider (PNG & SVG) */}
          {format !== 'json' && (
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Export Scale
                </label>
                <span className="font-mono text-indigo-400 font-semibold">
                  {scale}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full accent-indigo-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.5x</span>
                <span>1x</span>
                <span>2x</span>
                <span>4x</span>
              </div>
            </div>
          )}

          {/* Quality Slider (PNG only) */}
          {format === 'png' && (
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Image Quality
                </label>
                <span className="font-mono text-cyan-400 font-semibold">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                disabled={isExporting}
                className="w-full accent-cyan-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>
          )}

          {/* Background Color Picker (PNG only) */}
          {format === 'png' && (
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Background Fill
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isExporting}
                  className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer overflow-hidden"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isExporting}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-xs focus:border-indigo-500/80 outline-none"
                />
              </div>

              {/* Quick Preset Color Swatches */}
              <div className="flex items-center gap-1.5 pt-1">
                {QUICK_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBackgroundColor(c.value)}
                    disabled={isExporting}
                    className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Toggles */}
          <div className="space-y-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                disabled={isExporting || format === 'png'}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 accent-indigo-500 cursor-pointer"
              />
              <span className={`text-xs ${format === 'png' ? 'text-slate-600' : 'text-slate-300'}`}>
                Include metadata {format === 'png' && '(SVG & JSON only)'}
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                disabled={isExporting || format !== 'json'}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 accent-indigo-500 cursor-pointer"
              />
              <span className={`text-xs ${format !== 'json' ? 'text-slate-600' : 'text-slate-300'}`}>
                Include undo history {format !== 'json' && '(JSON only)'}
              </span>
            </label>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>Generating export file...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 border border-indigo-500/50 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : '🚀 Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}