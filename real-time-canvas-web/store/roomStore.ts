/**
 * Zustand store for room management
 * Handles room state, user authentication, and room settings
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, RoomUser, RoomSettings, AuthState } from '@/types/room'

interface RoomStore extends AuthState {
  // Room state
  currentRoom: Room | null
  rooms: Room[]
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentRoom: (room: Room | null) => void
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  removeRoom: (roomId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAuth: (auth: Partial<AuthState>) => void
  clearAuth: () => void
  reset: () => void
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      // Auth state
      isAuthenticated: false,
      userId: null,
      username: null,
      roomId: null,
      guestMode: false,
      token: undefined,

      // Room state
      currentRoom: null,
      rooms: [],
      isLoading: false,
      error: null,

      /**
       * Set current room
       */
      setCurrentRoom: (room: Room | null) => {
        set({ currentRoom: room })
      },

      /**
       * Set rooms list
       */
      setRooms: (rooms: Room[]) => {
        set({ rooms })
      },

      /**
       * Add a room
       */
      addRoom: (room: Room) => {
        const { rooms } = get()
        set({ rooms: [...rooms, room] })
      },

      /**
       * Update a room
       */
      updateRoom: (roomId: string, updates: Partial<Room>) => {
        const { rooms, currentRoom } = get()
        set({
          rooms: rooms.map((room) =>
            room.id === roomId ? { ...room, ...updates } : room
          ),
          currentRoom: currentRoom?.id === roomId ? { ...currentRoom, ...updates } : currentRoom,
        })
      },

      /**
       * Remove a room
       */
      removeRoom: (roomId: string) => {
        const { rooms } = get()
        set({
          rooms: rooms.filter((room) => room.id !== roomId),
          currentRoom: get().currentRoom?.id === roomId ? null : get().currentRoom,
        })
      },

      /**
       * Set loading state
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      /**
       * Set error state
       */
      setError: (error: string | null) => {
        set({ error })
      },

      /**
       * Set authentication state
       */
      setAuth: (auth: Partial<AuthState>) => {
        set((state) => ({
          ...state,
          ...auth,
          isAuthenticated: auth.isAuthenticated ?? state.isAuthenticated,
        }))
      },

      /**
       * Clear authentication
       */
      clearAuth: () => {
        set({
          isAuthenticated: false,
          userId: null,
          username: null,
          roomId: null,
          guestMode: false,
          token: undefined,
        })
      },

      /**
       * Reset store
       */
      reset: () => {
        set({
          currentRoom: null,
          rooms: [],
          isLoading: false,
          error: null,
        })
      },
    }),
    {
      name: 'room-store',
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
        roomId: state.roomId,
        guestMode: state.guestMode,
        isAuthenticated: state.isAuthenticated,
        currentRoom: state.currentRoom,
      }),
    }
  )
)
