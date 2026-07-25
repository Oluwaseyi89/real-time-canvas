/**
 * Room management hook
 * Handles room creation, joining, listing, and sharing
 */

import { useState, useCallback, useEffect } from 'react'
import { useRoomStore } from '@/store/roomStore'
import { useAuth } from './useAuth'
import type { CreateRoomRequest, JoinRoomRequest, Room } from '@/types/room'
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
    clearAuth,
  } = useRoomStore()

  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

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
        // Generate room ID
        const roomId = `room-${nanoid(10)}`
        const inviteCode = nanoid(8)

        // Create room object
        const room: Room = {
          id: roomId,
          name: roomName.trim(),
          ownerId: userId!,
          createdAt: new Date(),
          updatedAt: new Date(),
          users: [
            {
              userId: userId!,
              username: username,
              role: 'owner',
              joinedAt: new Date(),
              lastActiveAt: new Date(),
            },
          ],
          isPrivate: options.isPrivate || false,
          inviteCode: options.isPrivate ? inviteCode : undefined,
          settings: {
            allowGuestUsers: true,
            allowObjectEditing: true,
            allowPhysics: true,
            maxUsers: 50,
            canvasBackground: '#f0f0f0',
          },
          objectCount: 0,
          lastActivity: new Date(),
        }

        // Store in local state
        addRoom(room)
        setCurrentRoom(room)

        // Store room in session
        sessionStorage.setItem('currentRoomId', roomId)

        onRoomCreated?.(room)
        return room
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
        setError(errorMessage)
        return null
      } finally {
        setIsCreating(false)
        setLoading(false)
      }
    },
    [isAuthenticated, username, userId, addRoom, setCurrentRoom, setError, setLoading, onRoomCreated]
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
        // Check if room exists in local store
        let room = rooms.find((r) => r.id === roomId)

        if (!room) {
          // Try to find room with invite code
          room = rooms.find((r) => r.inviteCode === inviteCode)
        }

        if (!room) {
          // If room not found locally, try to join via API
          // For now, create a mock response
          const mockRoom: Room = {
            id: roomId,
            name: `Room ${roomId.slice(0, 6)}`,
            ownerId: 'owner-' + nanoid(8),
            createdAt: new Date(),
            updatedAt: new Date(),
            users: [
              {
                userId: userId!,
                username: username,
                role: 'editor',
                joinedAt: new Date(),
                lastActiveAt: new Date(),
              },
            ],
            isPrivate: !!inviteCode,
            inviteCode: inviteCode || undefined,
            settings: {
              allowGuestUsers: true,
              allowObjectEditing: true,
              allowPhysics: true,
              maxUsers: 50,
              canvasBackground: '#f0f0f0',
            },
            objectCount: 0,
            lastActivity: new Date(),
          }
          room = mockRoom
          addRoom(room)
        } else {
          // Update existing room with new user
          const updatedRoom = {
            ...room,
            users: [
              ...room.users,
              {
                userId: userId!,
                username: username,
                role: 'editor' as const,
                joinedAt: new Date(),
                lastActiveAt: new Date(),
              },
            ],
            updatedAt: new Date(),
          }
          updateRoom(roomId, updatedRoom)
          room = updatedRoom
        }

        setCurrentRoom(room)
        sessionStorage.setItem('currentRoomId', roomId)

        onRoomJoined?.(room)
        return room
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to join room'
        setError(errorMessage)
        return null
      } finally {
        setIsJoining(false)
        setLoading(false)
      }
    },
    [isAuthenticated, username, userId, rooms, addRoom, updateRoom, setCurrentRoom, setError, setLoading, onRoomJoined]
  )

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      sessionStorage.removeItem('currentRoomId')
      setCurrentRoom(null)
      onRoomLeft?.()
    }
  }, [currentRoom, setCurrentRoom, onRoomLeft])

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
   * Load current room from session
   */
  const loadCurrentRoom = useCallback(() => {
    const roomId = sessionStorage.getItem('currentRoomId')
    if (roomId) {
      const room = rooms.find((r) => r.id === roomId)
      if (room) {
        setCurrentRoom(room)
      }
    }
  }, [rooms, setCurrentRoom])

  /**
   * Get user's rooms
   */
  const getUserRooms = useCallback(() => {
    if (!userId) return []
    return rooms.filter((room) =>
      room.users.some((user) => user.userId === userId)
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
    return currentRoom.users.some((user) => user.userId === userId)
  }, [currentRoom, userId])

  /**
   * Load current room on mount
   */
  useEffect(() => {
    loadCurrentRoom()
  }, [loadCurrentRoom])

  return {
    // State
    currentRoom,
    rooms: getUserRooms(),
    allRooms: rooms,
    isLoading,
    isCreating,
    isJoining,
    error,
    isInRoom: isInRoom(), // Computed boolean value
    isOwner: isRoomOwner(), // Computed boolean value

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
  }
}
