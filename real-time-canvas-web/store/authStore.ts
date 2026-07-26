/**
 * Zustand store for authentication state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthState {
  isAuthenticated: boolean
  userId: string | null
  username: string | null
  roomId: string | null
  guestMode: boolean
  token?: string
  isLoading: boolean
  error: string | null
}

interface AuthStore extends AuthState {
  setAuth: (auth: Partial<AuthState>) => void
  clearAuth: () => void
  fullReset: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      userId: null,
      username: null,
      roomId: null,
      guestMode: false,
      token: undefined,
      isLoading: false,
      error: null,

      setAuth: (auth: Partial<AuthState>) => {
        set((state) => ({
          ...state,
          ...auth,
          isAuthenticated: auth.isAuthenticated ?? state.isAuthenticated,
        }))
      },

      clearAuth: () => {
        set({
          isAuthenticated: false,
          userId: null,
          username: null,
          roomId: null,
          guestMode: false,
          token: undefined,
          error: null,
        })
      },

      fullReset: () => {
        set({
          isAuthenticated: false,
          userId: null,
          username: null,
          roomId: null,
          guestMode: false,
          token: undefined,
          isLoading: false,
          error: null,
        })
        
        // Remove all persisted data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-store')
          localStorage.removeItem('authToken')
          localStorage.removeItem('userId')
          localStorage.removeItem('username')
          sessionStorage.removeItem('guestId')
          sessionStorage.removeItem('username')
          sessionStorage.removeItem('currentRoomId')
          sessionStorage.removeItem('auth-store')
        }
      },

      logout: () => {
        // Clear all state
        set({
          isAuthenticated: false,
          userId: null,
          username: null,
          roomId: null,
          guestMode: false,
          token: undefined,
          isLoading: false,
          error: null,
        })
        
        // Remove all storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-store')
          localStorage.removeItem('authToken')
          localStorage.removeItem('userId')
          localStorage.removeItem('username')
          localStorage.removeItem('room-store')
          sessionStorage.clear()
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
        roomId: state.roomId,
        guestMode: state.guestMode,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
)
