/**
 * Authentication hook for managing user auth state
 * Handles guest mode, username management, and session persistence
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoomStore } from '@/store/roomStore'
import { nanoid } from 'nanoid'

interface UseAuthOptions {
  onLogin?: (username: string, isGuest: boolean) => void
  onLogout?: () => void
}

export function useAuth(options: UseAuthOptions = {}) {
  const { onLogin, onLogout } = options
  const {
    isAuthenticated,
    userId,
    username,
    guestMode,
    setAuth,
    clearAuth,
    isLoading,
    setLoading,
    setError,
    error,
  } = useRoomStore()

  const [isLoggingIn, setIsLoggingIn] = useState(false)

  /**
   * Login as guest with username
   */
  const loginAsGuest = useCallback(
    async (usernameInput: string) => {
      if (!usernameInput.trim()) {
        setError('Username is required')
        return false
      }

      setIsLoggingIn(true)
      setLoading(true)
      setError(null)

      try {
        // Generate guest user ID
        const guestId = `guest-${nanoid(12)}`

        // Store in session storage
        sessionStorage.setItem('guestId', guestId)
        sessionStorage.setItem('username', usernameInput.trim())

        // Update auth state
        setAuth({
          isAuthenticated: true,
          userId: guestId,
          username: usernameInput.trim(),
          guestMode: true,
        })

        onLogin?.(usernameInput.trim(), true)
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to login as guest'
        setError(errorMessage)
        return false
      } finally {
        setIsLoggingIn(false)
        setLoading(false)
      }
    },
    [setAuth, setError, setLoading, onLogin]
  )

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    try {
      // Clear session storage
      sessionStorage.removeItem('guestId')
      sessionStorage.removeItem('username')

      // Clear auth state
      clearAuth()
      onLogout?.()
    } catch (error) {
      console.error('[useAuth] Logout error:', error)
    }
  }, [clearAuth, onLogout])

  /**
   * Check if user is authenticated
   */
  const checkAuth = useCallback(() => {
    const storedUsername = sessionStorage.getItem('username')
    const storedGuestId = sessionStorage.getItem('guestId')

    if (storedUsername && storedGuestId) {
      if (!isAuthenticated) {
        setAuth({
          isAuthenticated: true,
          userId: storedGuestId,
          username: storedUsername,
          guestMode: true,
        })
      }
      return true
    }
    return false
  }, [isAuthenticated, setAuth])

  /**
   * Auto-login on mount if session exists
   */
  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth()
    }
  }, [isAuthenticated, checkAuth])

  return {
    isAuthenticated,
    userId,
    username,
    guestMode,
    isLoading: isLoading || isLoggingIn,
    error,
    loginAsGuest,
    logout,
    checkAuth,
  }
}
