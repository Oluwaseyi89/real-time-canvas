/**
 * Room management hook
 * Handles room creation, joining, listing, and sharing
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoomStore } from '@/store/roomStore'
import { useAuth } from './useAuth'
import { apiClient } from '@/lib/api/client'
import type { Room, RoomUser, RoomSettings } from '@/types/room'
import { nanoid } from 'nanoid'

interface UseRoomOptions {
  onRoomCreated?: (room: Room) => void
  onRoomJoined?: (room: Room) => void
  onRoomLeft?: () => void
}

export function useRoom(options: UseRoomOptions = {}) {
  const { onRoomCreated, onRoomJoined, onRoomLeft } = options
  const { isAuthenticated, userId, username } = useAuth()

  const {
    currentRoom,
    rooms,
    isLoading,
    error,
    setCurrentRoom,
    setRooms,
    addRoom,
    updateRoom,
    removeRoom,
    setLoading,
    setError,
  } = useRoomStore()

  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  /**
   * Fetch user rooms from backend
   */
  const fetchUserRooms = useCallback(async () => {
    if (!isAuthenticated || !userId) return

    try {
      setLoading(true)
      const response = await apiClient.getRooms()
      if (response.data && Array.isArray(response.data)) {
        setRooms(response.data)
      }
    } catch (error) {
      console.error('[useRoom] Failed to fetch rooms:', error)
      // Fallback to local rooms
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, userId, setRooms, setLoading])

  /**
   * Create a new room
   */
  const createRoom = useCallback(
    async (roomName: string, options: { isPrivate?: boolean } = {}) => {
      if (!isAuthenticated || !username) {
        setError('Please login first')
        return null
      }

      if (!roomName.trim()) {
        setError('Room name is required')
        return null
      }

      setIsCreating(true)
      setLoading(true)
      setError(null)

      try {
        // Call backend to create room
        const response = await apiClient.createRoom({
          name: roomName.trim(),
          isPrivate: options.isPrivate || false,
          maxUsers: 50,
        })

        if (response.data) {
          const room = response.data as Room
          addRoom(room)
          setCurrentRoom(room)
          sessionStorage.setItem('currentRoomId', room.id)
          onRoomCreated?.(room)
          return room
        }
        return null
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to create room'
        setError(errorMessage)
        return null
      } finally {
        setIsCreating(false)
        setLoading(false)
      }
    },
    [isAuthenticated, username, addRoom, setCurrentRoom, setError, setLoading, onRoomCreated]
  )

  /**
   * Join an existing room
   */
  const joinRoom = useCallback(
    async (roomId: string, inviteCode?: string) => {
      if (!isAuthenticated || !username) {
        setError('Please login first')
        return null
      }

      setIsJoining(true)
      setLoading(true)
      setError(null)

      try {
        // Call backend to join room
        const response = await apiClient.joinRoom(roomId, { inviteCode })

        if (response.data) {
          const room = response.data as Room
          // Check if room exists in local store
          const existingIndex = rooms.findIndex(r => r.id === room.id)
          if (existingIndex >= 0) {
            updateRoom(room.id, room)
          } else {
            addRoom(room)
          }
          
          setCurrentRoom(room)
          sessionStorage.setItem('currentRoomId', room.id)
          onRoomJoined?.(room)
          return room
        }
        return null
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to join room'
        setError(errorMessage)
        return null
      } finally {
        setIsJoining(false)
        setLoading(false)
      }
    },
    [isAuthenticated, username, rooms, addRoom, updateRoom, setCurrentRoom, setError, setLoading, onRoomJoined]
  )

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(async () => {
    if (!currentRoom || !userId) return

    try {
      // Call backend to leave room
      await apiClient.leaveRoom(currentRoom.id)
      
      sessionStorage.removeItem('currentRoomId')
      setCurrentRoom(null)
      onRoomLeft?.()
    } catch (error) {
      console.error('[useRoom] Failed to leave room:', error)
      // Fallback: still leave locally
      sessionStorage.removeItem('currentRoomId')
      setCurrentRoom(null)
      onRoomLeft?.()
    }
  }, [currentRoom, userId, setCurrentRoom, onRoomLeft])

  /**
   * Get room invite link
   */
  const getRoomInviteLink = useCallback((roomId?: string): string => {
    const targetRoomId = roomId || currentRoom?.id
    if (!targetRoomId) return ''

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/room/${targetRoomId}`
  }, [currentRoom])

  /**
   * Get room invite link with invite code
   */
  const getRoomInviteLinkWithCode = useCallback((inviteCode?: string): string => {
    const link = getRoomInviteLink()
    if (!link) return ''
    if (inviteCode || currentRoom?.inviteCode) {
      return `${link}?code=${inviteCode || currentRoom?.inviteCode}`
    }
    return link
  }, [currentRoom, getRoomInviteLink])

  /**
   * Copy room invite link to clipboard
   */
  const copyInviteLink = useCallback(async (roomId?: string): Promise<boolean> => {
    const link = getRoomInviteLink(roomId)
    if (!link) return false

    try {
      await navigator.clipboard.writeText(link)
      return true
    } catch (error) {
      console.error('[useRoom] Failed to copy link:', error)
      return false
    }
  }, [getRoomInviteLink])

  /**
   * Load current room from session or backend
   */
  const loadCurrentRoom = useCallback(async () => {
    const roomId = sessionStorage.getItem('currentRoomId')
    if (roomId) {
      // Try to find in local store first
      const room = rooms.find((r) => r.id === roomId)
      if (room) {
        setCurrentRoom(room)
        return
      }

      // If not in local store, fetch from backend
      try {
        const response = await apiClient.getRoom(roomId)
        if (response.data) {
          const room = response.data as Room
          addRoom(room)
          setCurrentRoom(room)
        }
      } catch (error) {
        console.error('[useRoom] Failed to load room:', error)
        sessionStorage.removeItem('currentRoomId')
      }
    }
  }, [rooms, setCurrentRoom, addRoom])

  /**
   * Get user's rooms
   */
  const getUserRooms = useCallback(() => {
    if (!userId) return []
    return rooms.filter((room) =>
      room.users?.some((user) => user.userId === userId)
    )
  }, [rooms, userId])

  /**
   * Get room by ID
   */
  const getRoomById = useCallback(
    (roomId: string): Room | undefined => {
      return rooms.find((room) => room.id === roomId)
    },
    [rooms]
  )

  /**
   * Check if user is room owner
   */
  const isRoomOwner = useCallback((): boolean => {
    if (!currentRoom || !userId) return false
    return currentRoom.ownerId === userId
  }, [currentRoom, userId])

  /**
   * Check if user is in room
   */
  const isInRoom = useCallback((): boolean => {
    if (!currentRoom || !userId) return false
    return currentRoom.users?.some((user) => user.userId === userId) || false
  }, [currentRoom, userId])

  /**
   * Load current room on mount
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserRooms()
      loadCurrentRoom()
    }
  }, [isAuthenticated, fetchUserRooms, loadCurrentRoom])

  return {
    // State
    currentRoom,
    rooms: getUserRooms(),
    allRooms: rooms,
    isLoading,
    isCreating,
    isJoining,
    error,
    isInRoom: isInRoom(),
    isOwner: isRoomOwner(),

    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomInviteLink,
    getRoomInviteLinkWithCode,
    copyInviteLink,
    loadCurrentRoom,
    getRoomById,
    isRoomOwner,
    fetchUserRooms,
  }
}
