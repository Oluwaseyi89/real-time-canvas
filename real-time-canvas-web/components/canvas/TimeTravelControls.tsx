'use client'

/**
 * Time Travel Controls Component
 * Provides a floating overlay for recording session events, scrubbing timeline progress,
 * and replaying canvas interactions at variable speeds.
 */

import { useState, useCallback } from 'react'
import { useTimeTravel } from '@/hooks/useTimeTravel'

interface TimeTravelControlsProps {
  className?: string
}

const SPEED_PRESETS = [0.5, 1, 2, 4]

export function TimeTravelControls({ className = '' }: TimeTravelControlsProps) {
  const {
    state,
    isRecording,
    isReplaying,
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

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value)
      if (state.events.length > 0) {
        const totalDuration = state.duration
        const time = (value / 100) * totalDuration
        seek(time)
      }
    },
    [state.events.length, state.duration, seek]
  )

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Calculate percentage along timeline
  const progressPercent =
    state.events.length > 0 && state.currentEventIndex >= 0
      ? (state.currentEventIndex / (state.events.length - 1 || 1)) * 100
      : 0

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-6 z-40 p-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 group"
        title="Show Time Travel Controls"
      >
        <svg className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-semibold pr-1">Time Travel</span>
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-24 left-6 z-40 w-80 p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/70 shadow-2xl text-slate-200 select-none ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Time Travel</h4>
        </div>

        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Rec
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">Idle</span>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            title="Minimize panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Record toggle button */}
        <button
          type="button"
          onClick={handleRecordToggle}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-ping' : 'bg-rose-400'}`} />
          {isRecording ? 'Stop Recording' : 'Start Recording Session'}
        </button>

        {/* Playback Controls */}
        <div className="flex items-center justify-between bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={stepBackward}
              disabled={!state.events.length || state.isPlaying}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Step backward"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              disabled={!state.events.length}
              className="p-1.5 text-slate-100 bg-indigo-600/80 hover:bg-indigo-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              title={state.isPlaying && !state.isPaused ? 'Pause' : 'Play'}
            >
              {state.isPlaying && !state.isPaused ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={stop}
              disabled={!state.isPlaying}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Stop"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>

            <button
              type="button"
              onClick={stepForward}
              disabled={!state.events.length || state.isPlaying}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Step forward"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <span className="text-[11px] font-mono font-medium text-slate-400 px-2">
            {state.events.length} {state.events.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* Timeline Scrubbing Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={handleSeek}
            disabled={!state.events.length}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0:00</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
          <span className="text-[11px] font-medium text-slate-400">Speed:</span>
          <div className="flex gap-1">
            {SPEED_PRESETS.map((speed) => {
              const isSelected = state.speed === speed
              return (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    isSelected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {speed}x
                </button>
              )
            })}
          </div>
        </div>

        {/* Clear Events */}
        {state.events.length > 0 && (
          <button
            type="button"
            onClick={clearEvents}
            className="w-full py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
          >
            Clear Timeline
          </button>
        )}
      </div>
    </div>
  )
}