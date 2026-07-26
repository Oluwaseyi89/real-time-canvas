/**
 * Authentication hook for managing user auth state
 * Handles guest mode, username management, and session persistence
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoomStore } from '@/store/roomStore'
import { apiClient } from '@/lib/api/client'
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
        // Call backend guest login
        const response = await apiClient.guestLogin({ username: usernameInput.trim() })
        
        if (response.data) {
          const user = response.data
          
          // Store in localStorage
          localStorage.setItem('userId', user.id)
          localStorage.setItem('username', user.username)
          localStorage.setItem('authToken', `token-${user.id}`)
          
          // Store in session storage as fallback
          sessionStorage.setItem('guestId', user.id)
          sessionStorage.setItem('username', user.username)

          // Update auth state
          setAuth({
            isAuthenticated: true,
            userId: user.id,
            username: user.username,
            guestMode: true,
          })

          onLogin?.(user.username, true)
          return true
        }
        return false
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to login as guest'
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
   * Login with username and password
   */
  const login = useCallback(
    async (usernameInput: string, password: string) => {
      if (!usernameInput.trim()) {
        setError('Username is required')
        return false
      }

      setIsLoggingIn(true)
      setLoading(true)
      setError(null)

      try {
        const response = await apiClient.login({ username: usernameInput.trim(), password })
        
        if (response.data) {
          const user = response.data
          
          localStorage.setItem('userId', user.id)
          localStorage.setItem('username', user.username)
          localStorage.setItem('authToken', `token-${user.id}`)
          
          setAuth({
            isAuthenticated: true,
            userId: user.id,
            username: user.username,
            guestMode: false,
          })

          onLogin?.(user.username, false)
          return true
        }
        return false
      } catch (error: any) {
        const errorMessage = error.message || 'Invalid credentials'
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
   * Register a new user
   */
  const register = useCallback(
    async (usernameInput: string, email: string, password: string) => {
      if (!usernameInput.trim()) {
        setError('Username is required')
        return false
      }

      setIsLoggingIn(true)
      setLoading(true)
      setError(null)

      try {
        const response = await apiClient.register({ 
          username: usernameInput.trim(), 
          email, 
          password,
          isGuest: false,
        })
        
        if (response.data) {
          const user = response.data
          
          localStorage.setItem('userId', user.id)
          localStorage.setItem('username', user.username)
          localStorage.setItem('authToken', `token-${user.id}`)
          
          setAuth({
            isAuthenticated: true,
            userId: user.id,
            username: user.username,
            guestMode: false,
          })

          onLogin?.(user.username, false)
          return true
        }
        return false
      } catch (error: any) {
        const errorMessage = error.message || 'Registration failed'
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
      // Clear all storage
      localStorage.removeItem('guestId')
      localStorage.removeItem('username')
      localStorage.removeItem('userId')
      localStorage.removeItem('authToken')
      sessionStorage.removeItem('guestId')
      sessionStorage.removeItem('username')
      sessionStorage.removeItem('currentRoomId')

      // Clear auth state
      clearAuth()
      onLogout?.()
    } catch (error) {
      console.error('[useAuth] Logout error:', error)
    }
  }, [clearAuth, onLogout])

  /**
   * Check if user is authenticated via backend
   */
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        return false
      }

      // Verify with backend
      const response = await apiClient.getProfile()
      if (response.data) {
        const user = response.data
        setAuth({
          isAuthenticated: true,
          userId: user.id,
          username: user.username,
          guestMode: user.isGuest || false,
        })
        return true
      }
      return false
    } catch (error) {
      // If backend fails, fallback to local session
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
    }
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
    login,
    register,
    logout,
    checkAuth,
  }
}
