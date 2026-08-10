/**
 * Authentication hook for managing user auth state
 */

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api/client'

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
    logout: storeLogout,
    isLoading,
    setLoading,
    setError,
    error,
  } = useAuthStore()

  const [isLoggingIn, setIsLoggingIn] = useState(false)

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
        const response = await apiClient.guestLogin({ username: usernameInput.trim() })
        
        if (response.data) {
          const user = response.data
          
          localStorage.setItem('userId', user.id)
          localStorage.setItem('username', user.username)
          localStorage.setItem('authToken', user.token)

          sessionStorage.setItem('guestId', user.id)
          sessionStorage.setItem('username', user.username)

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
          localStorage.setItem('authToken', user.token)

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
          localStorage.setItem('authToken', user.token)

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

  const logout = useCallback(() => {
    // Call the store logout which clears everything
    storeLogout()
    onLogout?.()
    
    // Force reload to reset all state
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [storeLogout, onLogout])

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        return false
      }

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
