/**
 * Loading component for the canvas room
 * Shows a loading spinner while the canvas initializes
 */

export default function CanvasRoomLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-canvas-bg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading your canvas...</p>
        <p className="mt-1 text-sm text-gray-400">Preparing your collaborative workspace</p>
      </div>
    </div>
  )
}
