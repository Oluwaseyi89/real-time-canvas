'use client'

import { useState } from 'react'

export default function Home() {
  const [username, setUsername] = useState('')
  const [roomName, setRoomName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateRoom = () => {
    if (!username.trim() || !roomName.trim()) return
    setIsCreating(true)
    sessionStorage.setItem('username', username)
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    window.location.href = `/room/${roomId}`
  }

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
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="My Awesome Canvas"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={!username.trim() || !roomName.trim() || isCreating}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : '🚀 Create Room'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or join existing</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste room link"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm">
              Join
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-400 text-center">
          🔥 Supports: Text • Shapes • Images • Sticky Notes • Audio • Physics
        </div>
      </div>
    </main>
  )
}
