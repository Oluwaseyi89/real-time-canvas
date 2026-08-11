'use client'

/**
 * Physics controls panel
 * Provides real-time sliders and presets for canvas physics properties
 */

import React, { useState } from 'react'
import { Tooltip } from '@/components/ui/Tooltip'

export interface PhysicsSettings {
  gravity: number
  friction: number
  restitution: number // bounciness
  airResistance: number
  timeScale: number
  enabled: boolean
}

interface PhysicsControlsProps {
  settings?: PhysicsSettings
  onChange?: (newSettings: PhysicsSettings) => void
  onReset?: () => void
  className?: string
}

const DEFAULT_SETTINGS: PhysicsSettings = {
  gravity: 9.8,
  friction: 0.1,
  restitution: 0.8,
  airResistance: 0.02,
  timeScale: 1.0,
  enabled: true,
}

export function PhysicsControls({
  settings = DEFAULT_SETTINGS,
  onChange,
  onReset,
  className = '',
}: PhysicsControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [current, setCurrent] = useState<PhysicsSettings>(settings)

  const updateSetting = <K extends keyof PhysicsSettings>(key: K, value: PhysicsSettings[K]) => {
    const updated = { ...current, [key]: value }
    setCurrent(updated)
    onChange?.(updated)
  }

  const applyPreset = (preset: Partial<PhysicsSettings>) => {
    const updated = { ...current, ...preset }
    setCurrent(updated)
    onChange?.(updated)
  }

  return (
    <div className={`transition-all duration-200 ${className}`}>
      <div className="glass-panel rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden w-72 backdrop-blur-xl">
        {/* Header Toggle */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
              Physics Engine
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle Physics On/Off */}
            <button
              onClick={() => updateSetting('enabled', !current.enabled)}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full transition-all ${
                current.enabled
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {current.enabled ? 'ACTIVE' : 'OFF'}
            </button>

            {/* Expand / Collapse Panel */}
            <Tooltip label={isExpanded ? 'Collapse settings' : 'Expand settings'}>
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Collapsible Control Sliders */}
        {isExpanded && (
          <div className="p-4 space-y-4 text-xs text-slate-300">
            {/* Quick Presets */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Environments
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => applyPreset({ gravity: 0, airResistance: 0 })}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] border border-slate-700/50 transition-colors"
                >
                  Zero-G
                </button>
                <button
                  onClick={() => applyPreset({ gravity: 1.62, airResistance: 0 })}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] border border-slate-700/50 transition-colors"
                >
                  Moon
                </button>
                <button
                  onClick={() => applyPreset({ gravity: 9.8, airResistance: 0.02, friction: 0.1 })}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] border border-slate-700/50 transition-colors"
                >
                  Earth
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-slate-800" />

            {/* Sliders */}
            <div className="space-y-3">
              {/* Gravity Slider */}
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span className="text-slate-400">Gravity</span>
                  <span className="text-indigo-400 font-bold">{current.gravity.toFixed(1)} m/s²</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.1"
                  value={current.gravity}
                  onChange={(e) => updateSetting('gravity', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Bounciness (Restitution) Slider */}
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span className="text-slate-400">Restitution</span>
                  <span className="text-indigo-400 font-bold">{Math.round(current.restitution * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={current.restitution}
                  onChange={(e) => updateSetting('restitution', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Friction Slider */}
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span className="text-slate-400">Friction</span>
                  <span className="text-indigo-400 font-bold">{current.friction.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={current.friction}
                  onChange={(e) => updateSetting('friction', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Time Scale Slider */}
              <div>
                <div className="flex justify-between font-mono mb-1">
                  <span className="text-slate-400">Time Speed</span>
                  <span className="text-indigo-400 font-bold">{current.timeScale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={current.timeScale}
                  onChange={(e) => updateSetting('timeScale', parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Footer Reset */}
            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                onClick={() => {
                  setCurrent(DEFAULT_SETTINGS)
                  onChange?.(DEFAULT_SETTINGS)
                  onReset?.()
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}