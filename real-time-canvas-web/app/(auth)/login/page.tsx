'use client'

/**
 * World-Class Login & Onboarding Page
 * Establishes real-time session identity using useAuth hook.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { loginAsGuest, username: currentUsername, error: authError } = useAuth()
  
  const [usernameInput, setUsernameInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Pre-fill input if session already has a username stored
  useEffect(() => {
    const stored = sessionStorage.getItem('username') || currentUsername
    if (stored) {
      setUsernameInput(stored)
    }
  }, [currentUsername])

  // Handle setting session identity and navigating
  const handleLogin = useCallback(
    async (nameToSet?: string) => {
      const finalName = (nameToSet || usernameInput).trim()

      if (!finalName) {
        setLocalError('Please enter a display name to continue')
        return
      }

      setIsLoading(true)
      setLocalError(null)

      try {
        const success = await loginAsGuest(finalName)
        if (success) {
          router.push('/')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to establish session'
        setLocalError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [usernameInput, loginAsGuest, router]
  )

  // Quick action: Generate guest identity
  const handleGuestLogin = useCallback(() => {
    const randomGuest = `Guest_${Math.floor(1000 + Math.random() * 9000)}`
    handleLogin(randomGuest)
  }, [handleLogin])

  const activeError = localError || authError

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden p-4">
      {/* Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-950/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/50 text-2xl shadow-lg shadow-indigo-950/50 mb-3">
            ✨
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Infinite Canvas
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1.5">
            Real-time collaborative whiteboard & spatial workspace
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value)
                if (localError) setLocalError(null)
              }}
              placeholder="e.g., Alex Developer"
              disabled={isLoading}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-xs outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
              autoFocus
            />
          </div>

          {/* Error Alert */}
          {activeError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in">
              <span>⚠️</span>
              <span>{activeError}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!usernameInput.trim() || isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-indigo-950/50 border border-indigo-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Entering Workspace...</span>
              </>
            ) : (
              <span>🚀 Enter Workspace</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-800/80" />
          <span className="text-[10px] font-mono text-slate-500 uppercase">Or</span>
          <div className="flex-1 h-px bg-slate-800/80" />
        </div>

        {/* Quick Guest Action */}
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isLoading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>👤</span>
          <span>Continue as Random Guest</span>
        </button>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 text-center font-mono mt-6">
          No sign-up required • Instant real-time multi-user sync
        </p>
      </div>
    </div>
  )
}