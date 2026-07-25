'use client'

/**
 * Physics controls component
 * Provides controls for physics engine settings
 */

import { useState } from 'react'
import { usePhysics } from '@/hooks/usePhysics'
import { useCanvasStore } from '@/store/canvasStore'

interface PhysicsControlsProps {
  className?: string
}

export function PhysicsControls({ className = '' }: PhysicsControlsProps) {
  const { isRunning, isPaused, start, stop, pause, resume, setGravity, setTimeScale } = usePhysics()
  const { physicsEnabled, physicsGravity, setPhysicsEnabled, setPhysicsGravity } = useCanvasStore()
  
  const [gravityX, setGravityX] = useState(physicsGravity.x)
  const [gravityY, setGravityY] = useState(physicsGravity.y)
  const [timeScale, setTimeScaleValue] = useState(1)

  const handleGravityChange = () => {
    const newGravity = { x: gravityX, y: gravityY }
    setGravity(newGravity)
    setPhysicsGravity(newGravity)
  }

  const handleTimeScaleChange = (scale: number) => {
    setTimeScaleValue(scale)
    setTimeScale(scale)
  }

  const togglePhysics = () => {
    if (physicsEnabled) {
      if (isRunning) {
        stop()
      } else {
        start()
      }
    }
    setPhysicsEnabled(!physicsEnabled)
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-border-light p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">⚡ Physics Controls</h4>
        <button
          onClick={togglePhysics}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            physicsEnabled 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {physicsEnabled ? (isRunning ? 'Running' : 'Stopped') : 'Disabled'}
        </button>
      </div>

      {physicsEnabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={isRunning ? pause : resume}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={isRunning ? stop : start}
              className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 w-8">Gravity X:</label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={gravityX}
                onChange={(e) => setGravityX(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{gravityX.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 w-8">Gravity Y:</label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={gravityY}
                onChange={(e) => setGravityY(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{gravityY.toFixed(1)}</span>
            </div>
            <button
              onClick={handleGravityChange}
              className="w-full px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
            >
              Apply Gravity
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Time Scale:</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={timeScale}
              onChange={(e) => handleTimeScaleChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-8">{timeScale.toFixed(1)}x</span>
          </div>
        </div>
      )}
    </div>
  )
}
