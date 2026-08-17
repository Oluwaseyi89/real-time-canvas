'use client'

/**
 * World-Class Login & Onboarding Page
 * Establishes real-time session identity using useAuth hook.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

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
    <div className="relative flex flex-col items-center justify-center min-h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden p-4 sm:p-6">
      {/* Background Mesh Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-slate-50/90 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Branding Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/50 text-xl sm:text-2xl shadow-lg shadow-indigo-950/50 mb-3">
            ✨
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Infinite Canvas
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-mono mt-1.5">
            Real-time collaborative whiteboard & spatial workspace
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
          className="space-y-3 sm:space-y-4 text-xs"
        >
          <Input
            label="Display Name"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value)
              if (localError) setLocalError(null)
            }}
            placeholder="e.g., Alex Developer"
            disabled={isLoading}
            autoFocus
          />

          {activeError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <span>⚠️</span>
              <span>{activeError}</span>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={!usernameInput.trim()}
            isLoading={isLoading}
            loadingText="Entering Workspace..."
          >
            🚀 Enter Workspace
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5 sm:my-6">
          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80" />
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500 uppercase">Or</span>
          <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80" />
        </div>

        {/* Quick Guest Action */}
        <Button type="button" variant="secondary" fullWidth size="lg" disabled={isLoading} onClick={handleGuestLogin}>
          <span>👤</span>
          <span>Continue as Random Guest</span>
        </Button>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 dark:text-slate-500 text-center font-mono mt-5 sm:mt-6">
          No sign-up required • Instant real-time multi-user sync
        </p>
      </div>
    </div>
  )
}
