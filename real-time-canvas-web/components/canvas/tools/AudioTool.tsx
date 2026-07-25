'use client'

/**
 * Audio tool component for adding audio recordings to canvas
 */

import { useState, useRef, useEffect } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface AudioToolProps {
  onAddAudio?: (audioUrl: string) => void
}

export function AudioTool({ onAddAudio }: AudioToolProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const { addImage } = useCanvas() // We'll use addImage for now, will add audio support later

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      setError('Failed to access microphone. Please allow microphone access.')
      console.error('[AudioTool] Error starting recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const handleAddAudio = async () => {
    if (!audioUrl) return
    setIsLoading(true)
    try {
      // For now, we'll add as an image placeholder
      // TODO: Implement proper audio object creation
      const obj = await addImage('/audio-icon-placeholder.png', {
        left: 100,
        top: 100,
      })
      if (obj) {
        // Store audio URL in metadata
        obj.set('metadata', { audioUrl })
        onAddAudio?.(audioUrl)
        setAudioUrl(null)
      }
    } catch (err) {
      setError('Failed to add audio to canvas')
      console.error('[AudioTool] Error adding audio:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file')
      return
    }

    const url = URL.createObjectURL(file)
    setAudioUrl(url)
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-white rounded-lg shadow border border-border-light min-w-[280px]">
      <div className="flex gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">🎙️</span>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 animate-pulse"
          >
            <span className="text-lg">⏹️</span>
            Stop Recording
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-xs text-gray-500">or upload</span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="w-full text-sm text-gray-500 file:mr-2 file:px-3 file:py-1 file:bg-gray-100 file:border-0 file:rounded file:text-sm file:cursor-pointer file:hover:bg-gray-200"
        disabled={isRecording}
      />

      {audioUrl && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <audio controls className="flex-1 h-8">
            <source src={audioUrl} />
          </audio>
          <button
            onClick={handleAddAudio}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add to Canvas'}
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  )
}
