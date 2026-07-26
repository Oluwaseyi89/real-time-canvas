'use client'

/**
 * Time travel controls component
 * Provides UI for session replay and event navigation
 */

import { useState, useCallback } from 'react'
import { useTimeTravel } from '@/hooks/useTimeTravel'

interface TimeTravelControlsProps {
  className?: string
}

export function TimeTravelControls({ className = '' }: TimeTravelControlsProps) {
  const {
    state,
    isRecording,
    isReplaying,
    recordEvent,
    startRecording,
    stopRecording,
    play,
    pause,
    stop,
    seek,
    stepForward,
    stepBackward,
    setSpeed,
    clearEvents,
  } = useTimeTravel()

  const [isOpen, setIsOpen] = useState(true)
  const [seekTime, setSeekTime] = useState(0)

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const handlePlayPause = useCallback(() => {
    if (state.isPlaying && !state.isPaused) {
      pause()
    } else if (state.isPaused) {
      play()
    } else {
      play({ speed: state.speed })
    }
  }, [state.isPlaying, state.isPaused, state.speed, play, pause])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setSeekTime(value)
    if (state.events.length > 0) {
      const totalDuration = state.duration
      const time = (value / 100) * totalDuration
      seek(time)
    }
  }, [state.events.length, state.duration, seek])

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const speed = parseFloat(e.target.value)
    setSpeed(speed)
  }, [setSpeed])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-30 p-2 bg-white rounded-lg shadow-lg border border-border-light hover:bg-gray-50 transition-colors"
        title="Show time travel controls"
      >
        <span className="text-lg">⏱️</span>
      </button>
    )
  }

  return (
    <div className={`fixed bottom-24 left-4 z-30 bg-white rounded-lg shadow-xl border border-border-light p-3 w-72 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-gray-700">⏱️ Time Travel</h4>
        <div className="flex items-center gap-1">
          <span className={`text-xs ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
            {isRecording ? '● Recording' : '○ Stopped'}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Record button */}
        <button
          onClick={handleRecordToggle}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRecording ? '⏹️ Stop Recording' : '🔴 Start Recording'}
        </button>

        {/* Playback controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={stepBackward}
              disabled={!state.events.length || state.isPlaying}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Step backward"
            >
              ⏪
            </button>
            <button
              onClick={handlePlayPause}
              disabled={!state.events.length}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={state.isPlaying && !state.isPaused ? 'Pause' : 'Play'}
            >
              {state.isPlaying && !state.isPaused ? '⏸️' : '▶️'}
            </button>
            <button
              onClick={stop}
              disabled={!state.isPlaying}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              ⏹️
            </button>
            <button
              onClick={stepForward}
              disabled={!state.events.length || state.isPlaying}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Step forward"
            >
              ⏩
            </button>
          </div>

          <span className="text-xs text-gray-500">
            {state.events.length} events
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="100"
            value={state.events.length > 0 ? (state.currentEventIndex / state.events.length) * 100 : 0}
            onChange={handleSeek}
            disabled={!state.events.length}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0:00</span>
            <span>{Math.round(state.duration / 1000)}s</span>
          </div>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Speed:</label>
          <select
            value={state.speed}
            onChange={handleSpeedChange}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
            <option value="8">8x</option>
          </select>
        </div>

        {/* Clear button */}
        {state.events.length > 0 && (
          <button
            onClick={clearEvents}
            className="w-full px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded transition-colors"
          >
            Clear All Events
          </button>
        )}

        {/* Status info */}
        <div className="text-xs text-gray-400">
          {state.isPlaying && !state.isPaused && (
            <span>▶️ Playing at {state.speed}x speed</span>
          )}
          {state.isPaused && (
            <span>⏸️ Paused at event {state.currentEventIndex + 1}</span>
          )}
          {!state.isPlaying && !state.isPaused && isReplaying && (
            <span>⏹️ Stopped</span>
          )}
          {!state.isPlaying && !state.isPaused && !isReplaying && state.events.length === 0 && (
            <span>💡 Record events to replay</span>
          )}
        </div>
      </div>
    </div>
  )
}
