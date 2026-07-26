'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useRoom } from '@/hooks/useRoom'
import { CreateRoomDialog } from '@/components/room/CreateRoomDialog'
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog'
import { RoomList } from '@/components/room/RoomList'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, username, loginAsGuest, logout, isLoading: authLoading } = useAuth()
  const { currentRoom, rooms, isLoading: roomLoading } = useRoom()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Auto-redirect if already in a room
  useEffect(() => {
    if (currentRoom) {
      router.push(`/room/${currentRoom.id}`)
    }
  }, [currentRoom, router])

  const handleLogin = async () => {
    if (!usernameInput.trim()) {
      setError('Please enter a username')
      return
    }
    setError(null)
    const success = await loginAsGuest(usernameInput.trim())
    if (success) {
      // User is now authenticated
    }
  }

  const handleRoomSelect = (roomId: string) => {
    router.push(`/room/${roomId}`)
  }

  const handleRoomCreated = (roomId: string) => {
    setShowCreateDialog(false)
    router.push(`/room/${roomId}`)
  }

  const handleRoomJoined = (roomId: string) => {
    setShowJoinDialog(false)
    router.push(`/room/${roomId}`)
  }

  const handleLogout = () => {
    logout()
    // Force reload to clear all state
    window.location.href = '/'
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎨 Collaborative Canvas
            </h1>
            <p className="text-gray-500">Real-time infinite canvas with physics &amp; magic</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Choose a username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={authLoading}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!usernameInput.trim() || authLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Loading...' : '🚀 Enter Canvas'}
            </button>

            <div className="text-center text-xs text-gray-400">
              By continuing, you agree to our Terms of Service
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Show room management dashboard
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome, {username}!
              </h1>
              <p className="text-sm text-gray-500">Your collaborative canvas rooms</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>

          <RoomList
            onSelectRoom={handleRoomSelect}
            onJoinRoom={() => setShowJoinDialog(true)}
            onCreateRoom={() => setShowCreateDialog(true)}
          />
        </div>
      </div>

      <CreateRoomDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleRoomCreated}
      />

      <JoinRoomDialog
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onSuccess={handleRoomJoined}
      />
    </main>
  )
}
