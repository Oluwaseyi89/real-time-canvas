'use client'

/**
 * Room Creation Dialog Component
 * Enables users to name and configure visibility settings for a new collaboration room.
 */

import { useState, useCallback } from 'react'
import { useRoom } from '@/hooks/useRoom'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface CreateRoomDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (roomId: string) => void
}

const FORM_ID = 'create-room-form'

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Room"
      icon="✨"
      footer={
        <>
          <Button type="button" variant="secondary" fullWidth disabled={isLoading} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            fullWidth
            disabled={!roomName.trim()}
            isLoading={isLoading}
            loadingText="Creating..."
          >
            🚀 Create Room
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault()
          handleCreate()
        }}
        className="space-y-4 text-xs"
      >
        <Input
          label="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g., Infinite Whiteboard Sprint"
          disabled={isLoading}
          autoFocus
        />

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
