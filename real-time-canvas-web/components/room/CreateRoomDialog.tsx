'use client'

/**
 * Room Creation Dialog Component
 * Enables users to name and configure visibility settings for a new collaboration room.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoom } from '@/hooks/useRoom'

interface CreateRoomDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (roomId: string) => void
}

export function CreateRoomDialog({ isOpen, onClose, onSuccess }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { createRoom } = useRoom()

  const handleClose = useCallback(() => {
    setRoomName('')
    setIsPrivate(false)
    setError(null)
    setIsLoading(false)
    onClose()
  }, [onClose])

  // Support pressing Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, handleClose])

  const handleCreate = useCallback(async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const room = await createRoom(roomName, { isPrivate })
      if (room) {
        onSuccess?.(room.id)
        handleClose()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [roomName, isPrivate, createRoom, onSuccess, handleClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-100 backdrop-blur-xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-bold tracking-wide text-slate-100">
              Create New Room
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Container */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
          className="space-y-4 text-xs"
        >
          {/* Room Name Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Infinite Whiteboard Sprint"
              disabled={isLoading}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
              autoFocus
            />
          </div>

          {/* Privacy Option Selection */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Room Privacy
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                disabled={isLoading}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !isPrivate
                    ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs text-slate-200">
                  <span>🌐</span>
                  <span>Public</span>
                </div>
                <span className="text-[10px] text-slate-400 leading-relaxed">
                  Anyone with the link can view and join
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                disabled={isLoading}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isPrivate
                    ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs text-slate-200">
                  <span>🔒</span>
                  <span>Private</span>
                </div>
                <span className="text-[10px] text-slate-400 leading-relaxed">
                  Requires invite code or permission
                </span>
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!roomName.trim() || isLoading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 border border-indigo-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>🚀 Create Room</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}