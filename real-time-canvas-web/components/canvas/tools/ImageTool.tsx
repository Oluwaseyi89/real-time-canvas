'use client'

/**
 * Image tool component for adding images to canvas
 */

import { useState, useRef, ChangeEvent } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface ImageToolProps {
  onAddImage?: (url: string) => void
}

export function ImageTool({ onAddImage }: ImageToolProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addImage } = useCanvas()

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const obj = await addImage(imageUrl)
      if (obj) {
        onAddImage?.(imageUrl)
        setImageUrl('')
      }
    } catch (err) {
      setError('Failed to load image. Please check the URL.')
      console.error('[ImageTool] Error loading image:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
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
      setError('Failed to upload image')
      console.error('[ImageTool] Error uploading image:', err)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-white rounded-lg shadow border border-border-light min-w-[300px]">
      <div className="flex gap-2">
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Enter image URL..."
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          disabled={isLoading}
        />
        <button
          onClick={handleUrlSubmit}
          disabled={!imageUrl.trim() || isLoading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Add URL'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-xs text-gray-500">or</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="flex-1 text-sm text-gray-500 file:mr-2 file:px-3 file:py-1 file:bg-gray-100 file:border-0 file:rounded file:text-sm file:cursor-pointer file:hover:bg-gray-200"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
