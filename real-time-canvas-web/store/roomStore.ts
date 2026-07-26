/**
 * Zustand store for room management
 * Handles room state only (auth moved to authStore)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room } from '@/types/room'

interface RoomStore {
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
  reset: () => void
}

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
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
        currentRoom: state.currentRoom,
        rooms: state.rooms,
      }),
    }
  )
)
