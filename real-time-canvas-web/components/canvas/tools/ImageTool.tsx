'use client'

/**
 * Image Tool Component
 * Allows users to add images to the canvas via local file upload, drag-and-drop, or web URL.
 */

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import apiClient from '@/lib/api/client'

interface ImageToolProps {
  roomId: string
  onAddImage?: (url: string) => void
}

type TabMode = 'file' | 'url'

export function ImageTool({ roomId, onAddImage }: ImageToolProps) {
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
      // Upload to the backend (S3 or local disk — see media_service.go) so
      // the returned URL is a real, permanent one every collaborator's
      // browser can load — a blob: URL only ever resolves in the tab that
      // created it, so other clients (and this tab after a reload) would
      // see a broken image.
      const { data } = await apiClient.uploadMedia(roomId, file)
      const obj = await addImage(data.url)
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
    <div className="flex flex-col gap-3 p-1 min-w-[300px]">
      {/* Mode Selector Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/80 text-xs font-medium text-slate-400">
        <button
          type="button"
          onClick={() => {
            setTab('file')
            setError(null)
          }}
          className={`flex-1 py-1 text-center rounded-lg transition-all ${
            tab === 'file' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200'
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
          className={`flex-1 py-1 text-center rounded-lg transition-all ${
            tab === 'url' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'hover:text-slate-200'
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
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            isDragging
              ? 'border-indigo-500 bg-indigo-950/30'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40'
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
            className="w-8 h-8 mb-1 text-slate-500"
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
          <p className="text-xs font-medium text-slate-300">
            {isLoading ? 'Processing image...' : 'Click or drop image here'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, SVG or GIF</p>
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
              className="flex-1 px-2.5 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!imageUrl.trim() || isLoading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:active:scale-100 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading ? 'Loading...' : 'Add Image'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/60 px-2.5 py-1.5 rounded-xl">
          {error}
        </div>
      )}
    </div>
  )
}