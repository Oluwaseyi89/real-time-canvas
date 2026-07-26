'use client'

/**
 * Room Join Dialog Component
 * Enables users to join an active room via room ID, invite code, or full invite link URL.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoom } from '@/hooks/useRoom'

interface JoinRoomDialogProps {
  isOpen: boolean
  onClose: () => void
  initialRoomId?: string
  initialInviteCode?: string
  onSuccess?: (roomId: string) => void
}

export function JoinRoomDialog({
  isOpen,
  onClose,
  initialRoomId = '',
  initialInviteCode = '',
  onSuccess,
}: JoinRoomDialogProps) {
  const [roomIdInput, setRoomIdInput] = useState(initialRoomId)
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { joinRoom } = useRoom()

  const handleClose = useCallback(() => {
    setRoomIdInput('')
    setInviteCode('')
    setError(null)
    setIsLoading(false)
    onClose()
  }, [onClose])

  // Support ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, handleClose])

  // Process incoming initial props
  useEffect(() => {
    if (initialRoomId) setRoomIdInput(initialRoomId)
    if (initialInviteCode) setInviteCode(initialInviteCode)
  }, [initialRoomId, initialInviteCode])

  /**
   * Helper function to extract room ID and optional query parameters (like code=xyz)
   * from full canvas URLs or plain text strings.
   */
  const processInputString = useCallback((rawText: string) => {
    const trimmed = rawText.trim()
    if (!trimmed) return

    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const parsedUrl = new URL(trimmed)
        const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)
        const roomIdx = pathSegments.indexOf('room')
        
        if (roomIdx !== -1 && pathSegments[roomIdx + 1]) {
          setRoomIdInput(pathSegments[roomIdx + 1])
        } else if (pathSegments.length > 0) {
          setRoomIdInput(pathSegments[pathSegments.length - 1])
        }

        const queryCode = parsedUrl.searchParams.get('code') || parsedUrl.searchParams.get('invite')
        if (queryCode) {
          setInviteCode(queryCode)
        }
        return
      }
    } catch {
      // Fallthrough to regular string handling
    }

    // Direct room ID string or path snippet
    const urlMatch = trimmed.match(/\/room\/([a-zA-Z0-9_-]+)/)
    if (urlMatch) {
      setRoomIdInput(urlMatch[1])
    } else {
      setRoomIdInput(trimmed)
    }
  }, [])

  const handleJoin = useCallback(async () => {
    const targetRoomId = roomIdInput.trim()
    if (!targetRoomId) {
      setError('Please enter a valid room ID or paste an invite link')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const room = await joinRoom(targetRoomId, inviteCode.trim() || undefined)
      if (room) {
        onSuccess?.(room.id)
        handleClose()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [roomIdInput, inviteCode, joinRoom, onSuccess, handleClose])

  // Handle instant clipboard paste
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        processInputString(text)
      }
    } catch {
      // Clipboard access denied or unavailable
    }
  }, [processInputString])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-100 backdrop-blur-xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚪</span>
            <h2 className="text-lg font-bold tracking-wide text-slate-100">
              Join Canvas Room
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
            handleJoin()
          }}
          className="space-y-4 text-xs"
        >
          {/* Room ID or Invite Link Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Room ID or Invite Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => processInputString(e.target.value)}
                placeholder="Paste room URL or enter Room ID"
                disabled={isLoading}
                className="flex-1 bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-colors font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Paste link from clipboard"
              >
                <span>📋</span>
                <span className="text-[11px]">Paste</span>
              </button>
            </div>
          </div>

          {/* Optional Invite Code Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Invite Code <span className="text-slate-600">(optional)</span>
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g., SECRET-123"
              disabled={isLoading}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 font-mono tracking-wider"
            />
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
              disabled={!roomIdInput.trim() || isLoading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 border border-indigo-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <span>🚀 Join Room</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}