'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CanvasRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [username, setUsername] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
      setIsReady(true)
    } else {
      router.push('/')
    }
  }, [router])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas-bg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="canvas-container">
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            🎨 Room: {roomId}
          </h2>
          <p className="text-gray-500">Welcome, {username}!</p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
            ⚡ Canvas core coming soon...
          </div>
        </div>
      </div>
    </div>
  )
}
