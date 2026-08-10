'use client'

/**
 * World-Class Canvas Workspace Portal
 * Serves as the primary launcher for creating new whiteboard rooms,
 * browsing active collaboration sessions, or joining existing canvases via ID.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useRoom'
import { RoomList } from '@/components/room/RoomList'
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog'
import { CreateRoomDialog } from '@/components/room/CreateRoomDialog'

export default function CanvasPage() {
  const router = useRouter()
  const { isAuthenticated, username, guestMode, logout, checkAuth } = useAuth()
  const { currentRoom, createRoom } = useRoom()

  // Modal states
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Resolve auth once before deciding whether to gate this page — avoids a
  // flash of the dashboard for a signed-out visitor before redirecting.
  const [authChecked, setAuthChecked] = useState(false)
  useEffect(() => {
    checkAuth().finally(() => setAuthChecked(true))
  }, [checkAuth])

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      router.push('/login')
    }
  }, [authChecked, isAuthenticated, router])

  // Auto-resume an in-progress room session (e.g. a reload) instead of
  // stranding the user back on the dashboard.
  useEffect(() => {
    if (currentRoom) {
      router.push(`/room/${currentRoom.id}`)
    }
  }, [currentRoom, router])

  // Navigate directly into selected room
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      router.push(`/room/${roomId}`)
    },
    [router]
  )

  // One-click room creation — skips the naming dialog for speed, using the
  // real room-creation API (this used to fabricate a client-side room id
  // and navigate straight to it, which pointed at a room that never
  // existed server-side).
  const handleQuickCreateRoom = useCallback(async () => {
    setIsCreating(true)
    try {
      const room = await createRoom(`Untitled Canvas ${new Date().toLocaleDateString()}`, {
        isPrivate: false,
      })
      if (room) {
        router.push(`/room/${room.id}`)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
    } finally {
      setIsCreating(false)
    }
  }, [createRoom, router])

  const handleRoomCreated = useCallback(
    (roomId: string) => {
      setIsCreateDialogOpen(false)
      router.push(`/room/${roomId}`)
    },
    [router]
  )

  if (!authChecked || !isAuthenticated) {
    return (
      <div className="relative flex items-center justify-center min-h-screen w-screen bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />
        <div className="relative z-10 w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-x-hidden flex flex-col">
      {/* Dynamic Ambient Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />

      {/* TOP GLASS NAVIGATION HEADER */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl px-6 py-4 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-xl shadow-lg shadow-indigo-950/50">
            ✨
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide text-slate-100">
              Infinite Canvas
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              Spatial Collaboration Engine
            </p>
          </div>
        </div>

        {/* User Identity Banner & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl font-mono text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{username || 'Guest Collaborator'}</span>
            {guestMode && (
              <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/50">
                Guest
              </span>
            )}
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-xs font-mono text-slate-400 hover:text-rose-300 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
            title="Switch Session Identity"
          >
            Exit
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
        {/* Hero Section Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-950 border border-indigo-500/30 p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
              <span>🚀</span>
              <span>Real-time Whiteboard & Physics Workspace</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">
              Collaborate without boundaries
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Create an infinite canvas room, invite your team, manipulate physics objects,
              and record time-travel replays in real-time.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={handleQuickCreateRoom}
                disabled={isCreating}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-all shadow-lg shadow-indigo-950/50 border border-indigo-500/50 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Launching Session...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>New Blank Canvas</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsJoinDialogOpen(true)}
                className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <span>🚪</span>
                <span>Join via Code or URL</span>
              </button>
            </div>
          </div>
        </div>

        {/* WORKSPACE & ROOM SELECTION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Rooms Column (2-Span) */}
          <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎨</span>
                <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">
                  Your Active Rooms
                </h3>
              </div>
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-mono cursor-pointer"
              >
                + Create New
              </button>
            </div>

            {/* Room List Component */}
            <RoomList
              onSelectRoom={handleSelectRoom}
              onJoinRoom={() => setIsJoinDialogOpen(true)}
              onCreateRoom={() => setIsCreateDialogOpen(true)}
            />
          </div>

          {/* Quick Access / Feature Highlights Column */}
          <div className="space-y-4">
            {/* Direct Join Action Card */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-3">
              <span className="text-2xl block">🔑</span>
              <h4 className="text-xs font-semibold text-slate-100 font-mono uppercase tracking-wider">
                Have an Invite Link?
              </h4>
              <p className="text-xs text-slate-400">
                Paste room URLs or join codes directly to enter collaborative sessions in real-time.
              </p>
              <button
                onClick={() => setIsJoinDialogOpen(true)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>Enter Invite Link</span>
              </button>
            </div>

            {/* System Status Telemetry Card */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">WebSocket Gateway</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Physics Engine</span>
                <span className="text-indigo-400">Matter.js Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Offline Sync</span>
                <span className="text-slate-300">Queue Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* JOIN ROOM MODAL */}
      <JoinRoomDialog
        isOpen={isJoinDialogOpen}
        onClose={() => setIsJoinDialogOpen(false)}
        onSuccess={(roomId) => router.push(`/room/${roomId}`)}
      />

      {/* CREATE ROOM MODAL */}
      <CreateRoomDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleRoomCreated}
      />
    </div>
  )
}
