'use client'

/**
 * Room Join Dialog Component
 * Enables users to join an active room via room ID, invite code, or full invite link URL.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoom } from '@/hooks/useRoom'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface JoinRoomDialogProps {
  isOpen: boolean
  onClose: () => void
  initialRoomId?: string
  initialInviteCode?: string
  onSuccess?: (roomId: string) => void
}

const FORM_ID = 'join-room-form'

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Join Canvas Room"
      icon="🚪"
      footer={
        <>
          <Button type="button" variant="secondary" fullWidth disabled={isLoading} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            fullWidth
            disabled={!roomIdInput.trim()}
            isLoading={isLoading}
            loadingText="Joining..."
          >
            🚀 Join Room
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault()
          handleJoin()
        }}
        className="space-y-4 text-xs"
      >
        <Input
          label="Room ID or Invite Link"
          value={roomIdInput}
          onChange={(e) => processInputString(e.target.value)}
          placeholder="Paste room URL or enter Room ID"
          disabled={isLoading}
          autoFocus
          rightElement={
            <Button type="button" variant="secondary" onClick={handlePaste} disabled={isLoading} title="Paste link from clipboard">
              <span>📋</span>
              <span className="text-[11px]">Paste</span>
            </Button>
          }
        />

        <Input
          label={
            <>
              Invite Code <span className="text-slate-400 dark:text-slate-600">(optional)</span>
            </>
          }
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="e.g., SECRET-123"
          disabled={isLoading}
          className="font-mono tracking-wider"
        />

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  )
}
