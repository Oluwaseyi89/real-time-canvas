'use client'

/**
 * Export modal component for canvas export
 * Provides UI for selecting export format and options
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

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState(1)
  const [quality, setQuality] = useState(1)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeHistory, setIncludeHistory] = useState(false)
  const [filename, setFilename] = useState('canvas-export')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')

  const { canvas } = useCanvasStore()
  const { username } = useAuth()
  const { currentRoom } = useRoom()
  const { isExporting, setExporting, setProgress, setError, addToHistory } = useExportStore()

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

      // Update progress
      setProgress(10)

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
          throw new Error(`Unsupported format: ${format}`)
        }
      }

      setProgress(100)
      addToHistory({ format, filename: finalFilename })

      // Close modal after successful export
      setTimeout(() => {
        onClose()
        setExporting(false)
      }, 500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">📤 Export Canvas</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isExporting}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['png', 'svg', 'json'] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    format === fmt
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filename
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="canvas-export"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isExporting}
              />
              <span className="text-gray-500 text-sm">.{format}</span>
            </div>
          </div>

          {/* Scale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scale: {scale}x
            </label>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full"
              disabled={isExporting || format === 'json'}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0.5x</span>
              <span>1x</span>
              <span>2x</span>
              <span>4x</span>
            </div>
          </div>

          {/* Quality (PNG only) */}
          {format === 'png' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quality: {Math.round(quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full"
                disabled={isExporting}
              />
            </div>
          )}

          {/* Background Color (PNG only) */}
          {format === 'png' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                  disabled={isExporting}
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
                  disabled={isExporting}
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                disabled={isExporting || format === 'png'}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Include metadata {format === 'png' && '(not supported for PNG)'}
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
                disabled={isExporting || format !== 'json'}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Include history {format !== 'json' && '(JSON only)'}
              </span>
            </label>
          </div>

          {/* Error */}
          {useExportStore.getState().error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {useExportStore.getState().error}
            </div>
          )}

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${useExportStore.getState().progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Exporting... {Math.round(useExportStore.getState().progress)}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : '🚀 Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
