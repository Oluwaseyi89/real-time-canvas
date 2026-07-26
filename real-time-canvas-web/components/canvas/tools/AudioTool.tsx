'use client'

/**
 * Audio Tool Component
 * Allows recording voice clips or uploading audio files to attach to the canvas.
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useCanvas } from '@/hooks/useCanvas'

interface AudioToolProps {
  onAddAudio?: (audioUrl: string) => void
}

export function AudioTool({ onAddAudio }: AudioToolProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { addImage } = useCanvas() // Canvas node creation (placeholder icon with audio metadata)

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [audioUrl])

  const startRecording = async () => {
    setError(null)
    setAudioUrl(null)
    setRecordingTime(0)

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

        // Stop all microphone tracks
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)

        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start duration counter
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      setError('Failed to access microphone. Please enable permissions.')
      console.error('[AudioTool] Error starting recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAddAudio = async () => {
    if (!audioUrl) return
    setIsLoading(true)

    try {
      // Creates a visual audio badge node on canvas
      const obj = await addImage('/audio-icon-placeholder.png', {
        left: 100,
        top: 100,
      })

      if (obj) {
        obj.set('metadata', { audioUrl })
        onAddAudio?.(audioUrl)
        setAudioUrl(null)
        setRecordingTime(0)
      }
    } catch (err) {
      setError('Failed to attach audio to canvas.')
      console.error('[AudioTool] Error adding audio:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file.')
      return
    }

    setError(null)
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
  }

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setRecordingTime(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 bg-white rounded-lg shadow-md border border-slate-200 min-w-[290px]">
      {/* Recording Actions */}
      <div className="flex flex-col gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!!audioUrl}
            className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            Record Audio
          </button>
        ) : (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-2 rounded-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-mono font-semibold text-rose-700">
                {formatTime(recordingTime)}
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded transition-colors"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {!audioUrl && !isRecording && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400 uppercase font-medium">or upload file</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1 file:bg-slate-100 file:border-0 file:rounded-md file:text-xs file:font-medium file:text-slate-700 file:cursor-pointer hover:file:bg-slate-200"
            disabled={isRecording}
          />
        </>
      )}

      {/* Audio Audio Preview & Confirmation */}
      {audioUrl && (
        <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-md">
          <audio controls className="w-full h-8">
            <source src={audioUrl} />
            Your browser does not support the audio element.
          </audio>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-100 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleAddAudio}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add to Canvas'}
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