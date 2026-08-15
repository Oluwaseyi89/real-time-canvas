'use client'

/**
 * Audio Tool Component
 * Allows recording voice clips or uploading audio files to attach to the canvas.
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import apiClient from '@/lib/api/client'

interface AudioToolProps {
  roomId: string
  onAddAudio?: (audioUrl: string) => void
}

export function AudioTool({ roomId, onAddAudio }: AudioToolProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // `audioUrl` above is only a local blob: preview URL (tab-scoped, doesn't
  // survive reload or reach other clients) — the actual bytes to upload on
  // "Add to Canvas" are kept here, separately, from whichever source
  // produced them (recording or file picker).
  const audioBlobRef = useRef<Blob | null>(null)

  const { addAudio } = useCanvas()

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
        audioBlobRef.current = audioBlob
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
    const blob = audioBlobRef.current
    if (!audioUrl || !blob) return
    setIsLoading(true)

    try {
      // Upload the actual bytes so the badge's audioUrl is a real,
      // permanent URL every collaborator's browser can play — the blob:
      // preview URL above only resolves in this tab.
      const filename = blob instanceof File ? blob.name : `recording-${Date.now()}.webm`
      const uploadFile = blob instanceof File ? blob : new File([blob], filename, { type: blob.type || 'audio/webm' })
      const { data } = await apiClient.uploadMedia(roomId, uploadFile)

      // Creates a real, playable audio badge (ObjectFactory.createAudioObject
      // wires up double-click-to-play) instead of a static placeholder icon.
      const obj = addAudio(data.url, {
        left: 100,
        top: 100,
      })

      if (obj) {
        onAddAudio?.(data.url)
        URL.revokeObjectURL(audioUrl)
        audioBlobRef.current = null
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
    audioBlobRef.current = file
    const url = URL.createObjectURL(file)
    setAudioUrl(url)
  }

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    audioBlobRef.current = null
    setRecordingTime(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3 p-1 min-w-[290px]">
      {/* Recording Actions */}
      <div className="flex flex-col gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!!audioUrl}
            className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition-all disabled:opacity-40 disabled:hover:bg-rose-600 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            Record Audio
          </button>
        ) : (
          <div className="flex items-center justify-between bg-rose-950/40 border border-rose-800/60 p-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-semibold text-rose-300">
                {formatTime(recordingTime)}
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {!audioUrl && !isRecording && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-[10px] text-slate-500 uppercase font-medium">or upload file</span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="w-full text-xs text-slate-400 file:mr-2 file:px-2.5 file:py-1 file:bg-slate-800 file:border file:border-slate-700/80 file:rounded-lg file:text-xs file:font-medium file:text-slate-300 file:cursor-pointer hover:file:bg-slate-700"
            disabled={isRecording}
          />
        </>
      )}

      {/* Audio Preview & Confirmation */}
      {audioUrl && (
        <div className="flex flex-col gap-2 bg-slate-900/60 border border-slate-700/80 p-2.5 rounded-xl">
          <audio controls className="w-full h-8">
            <source src={audioUrl} />
            Your browser does not support the audio element.
          </audio>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-100 border border-slate-700/80 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleAddAudio}
              disabled={isLoading}
              className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40"
            >
              {isLoading ? 'Adding...' : 'Add to Canvas'}
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