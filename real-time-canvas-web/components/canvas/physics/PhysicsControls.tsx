'use client'

/**
 * Physics Controls Component
 * Provides controls for physics engine settings, gravity vectors, and time scaling
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

  const handleGravityXChange = (val: number) => {
    setGravityX(val)
    const newGravity = { x: val, y: gravityY }
    setGravity(newGravity)
    setPhysicsGravity(newGravity)
  }

  const handleGravityYChange = (val: number) => {
    setGravityY(val)
    const newGravity = { x: gravityX, y: val }
    setGravity(newGravity)
    setPhysicsGravity(newGravity)
  }

  const applyPreset = (x: number, y: number) => {
    setGravityX(x)
    setGravityY(y)
    const newGravity = { x, y }
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
    } else {
      start()
    }
    setPhysicsEnabled(!physicsEnabled)
  }

  return (
    <div
      className={`w-72 bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 text-slate-200 shadow-2xl backdrop-blur-xl transition-all duration-200 select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">⚡</span>
          <h4 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
            Physics Engine
          </h4>
        </div>
        <button
          onClick={togglePhysics}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all cursor-pointer ${
            physicsEnabled
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
          }`}
        >
          {physicsEnabled ? (isRunning ? '● Active' : 'Stopped') : 'Disabled'}
        </button>
      </div>

      {physicsEnabled && (
        <div className="space-y-3.5 text-xs">
          {/* Execution Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={isRunning ? pause : resume}
              className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium rounded-lg border border-indigo-500/50 transition-colors shadow-sm cursor-pointer"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={isRunning ? stop : start}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Gravity Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => applyPreset(0, 1)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[10px] text-slate-300 transition-colors cursor-pointer"
              >
                Earth (1G)
              </button>
              <button
                onClick={() => applyPreset(0, 0)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[10px] text-slate-300 transition-colors cursor-pointer"
              >
                Zero-G
              </button>
              <button
                onClick={() => applyPreset(0, -1)}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 text-[10px] text-slate-300 transition-colors cursor-pointer"
              >
                Inverted
              </button>
            </div>
          </div>

          {/* Gravity Vector Sliders */}
          <div className="space-y-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <label className="text-slate-400 font-mono text-[11px] w-14">
                Grav X:
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={gravityX}
                onChange={(e) => handleGravityXChange(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
              <span className="text-indigo-400 font-mono text-[10px] w-8 text-right">
                {gravityX.toFixed(1)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-400 font-mono text-[11px] w-14">
                Grav Y:
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={gravityY}
                onChange={(e) => handleGravityYChange(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
              <span className="text-indigo-400 font-mono text-[10px] w-8 text-right">
                {gravityY.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Time Scale Control */}
          <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <label className="text-slate-400 font-mono text-[11px] w-14">
              Speed:
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={timeScale}
              onChange={(e) => handleTimeScaleChange(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
            <span className="text-cyan-400 font-mono text-[10px] w-8 text-right">
              {timeScale.toFixed(1)}x
            </span>
          </div>
        </div>
      )}
    </div>
  )
}