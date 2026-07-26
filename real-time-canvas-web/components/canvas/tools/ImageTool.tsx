'use client'

/**
 * Image Tool Component
 * Allows users to add images to the canvas via local file upload, drag-and-drop, or web URL.
 */

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface ImageToolProps {
  onAddImage?: (url: string) => void
}

type TabMode = 'file' | 'url'

export function ImageTool({ onAddImage }: ImageToolProps) {
  const [tab, setTab] = useState<TabMode>('file')
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addImage } = useCanvas()

  const handleUrlSubmit = async () => {
    const trimmedUrl = imageUrl.trim()
    if (!trimmedUrl) return

    setIsLoading(true)
    setError(null)

    try {
      const obj = await addImage(trimmedUrl)
      if (obj) {
        onAddImage?.(trimmedUrl)
        setImageUrl('')
      }
    } catch (err) {
      setError('Failed to load image. Please check the URL.')
      console.error('[ImageTool] Error loading image from URL:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = URL.createObjectURL(file)
      const obj = await addImage(url)
      if (obj) {
        onAddImage?.(file.name)
      }
    } catch (err) {
      setError('Failed to upload image.')
      console.error('[ImageTool] Error uploading image file:', err)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 bg-white rounded-lg shadow-md border border-slate-200 min-w-[300px]">
      {/* Mode Selector Tabs */}
      <div className="flex bg-slate-100 p-0.5 rounded-md text-xs font-medium text-slate-600">
        <button
          type="button"
          onClick={() => {
            setTab('file')
            setError(null)
          }}
          className={`flex-1 py-1 text-center rounded-sm transition-all ${
            tab === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('url')
            setError(null)
          }}
          className={`flex-1 py-1 text-center rounded-sm transition-all ${
            tab === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          Image URL
        </button>
      </div>

      {tab === 'file' ? (
        /* File Upload / Drag & Drop Target */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
          <svg
            className="w-8 h-8 mb-1 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs font-medium text-slate-700">
            {isLoading ? 'Processing image...' : 'Click or drop image here'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, SVG or GIF</p>
        </div>
      ) : (
        /* URL Input Field */
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!imageUrl.trim() || isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white font-medium rounded-md text-xs hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? 'Loading...' : 'Add Image'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md">
          {error}
        </div>
      )}
    </div>
  )
}