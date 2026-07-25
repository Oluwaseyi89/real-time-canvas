'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { ZoomControls } from '@/components/canvas/ZoomControls'
import { useCanvasStore } from '@/store/canvasStore'

export default function CanvasRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const [username, setUsername] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  const {
    canvasRef,
    containerRef,
    zoom,
    addText,
    addRectangle,
    addCircle,
    addStickyNote,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    isInitialized,
  } = useCanvas({
    onObjectAdded: (obj) => {
      console.log('[Canvas] Object added:', obj.type)
    },
    onObjectSelected: (obj) => {
      console.log('[Canvas] Object selected:', obj.type)
    },
    onZoomChange: (newZoom) => {
      console.log('[Canvas] Zoom changed:', newZoom)
    },
  })

  // Load username from session storage
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
      setIsReady(true)
    } else {
      router.push('/')
    }
  }, [router])

  // Show loading state
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
    <div className="relative w-screen h-screen overflow-hidden bg-canvas-bg">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="w-full h-full relative"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <ZoomControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          onFitToView={fitToView}
        />
      </div>

      {/* Toolbar placeholder */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-border-light p-2">
        <button
          onClick={() => addText('Hello World!')}
          className="toolbar-button w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Add Text"
        >
          <span className="text-lg">T</span>
        </button>
        <button
          onClick={() => addRectangle({ fill: '#3b82f6' })}
          className="toolbar-button w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Add Rectangle"
        >
          <span className="text-lg">▭</span>
        </button>
        <button
          onClick={() => addCircle({ fill: '#ef4444' })}
          className="toolbar-button w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Add Circle"
        >
          <span className="text-lg">●</span>
        </button>
        <button
          onClick={() => addStickyNote('New sticky note!')}
          className="toolbar-button w-10 h-10 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Add Sticky Note"
        >
          <span className="text-lg">📝</span>
        </button>
        <div className="w-px h-8 bg-gray-300 mx-1" />
        <button
          onClick={() => useCanvasStore.getState().clearAllObjects()}
          className="toolbar-button w-10 h-10 text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Clear All"
        >
          <span className="text-lg">✕</span>
        </button>
      </div>

      {/* Room info */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-border-light text-sm">
        <div className="text-gray-700">
          <span className="font-medium">Room:</span> {roomId}
        </div>
        <div className="text-gray-500 text-xs">
          <span className="font-medium">User:</span> {username}
        </div>
        <div className="text-gray-500 text-xs">
          <span className="font-medium">Zoom:</span> {Math.round(zoom * 100)}%
        </div>
        <div className="text-gray-400 text-[10px] mt-1">
          {isInitialized ? '✅ Canvas ready' : '⏳ Initializing...'}
        </div>
      </div>

      {/* Canvas instructions */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow border border-border-light text-xs text-gray-500">
        🖱️ Scroll to zoom • Drag to pan • Click objects to select
      </div>
    </div>
  )
}
