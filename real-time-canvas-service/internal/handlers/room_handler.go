package handlers

import (
	"net/http"

	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/services"

	"github.com/gin-gonic/gin"
)

// RoomHandler handles room endpoints
type RoomHandler struct {
	roomService *services.RoomService
}

// NewRoomHandler creates a new room handler
func NewRoomHandler(roomService *services.RoomService) *RoomHandler {
	return &RoomHandler{roomService: roomService}
}

// CreateRoom creates a new room
// @Summary Create a new room
// @Tags Rooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.CreateRoomRequest true "Room details"
// @Success 201 {object} dto.RoomResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /rooms [post]
func (h *RoomHandler) CreateRoom(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room, err := h.roomService.CreateRoom(userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to response
	userResponses := make([]dto.UserResponse, len(room.Users))
	for i, ru := range room.Users {
		userResponses[i] = dto.ToUserResponse(ru.User.ID, ru.User.Username, ru.User.IsGuest, ru.User.LastSeen)
	}

	response := dto.ToRoomResponse(
		room.ID, room.Name, room.OwnerID, room.IsPrivate,
		room.InviteCode, room.MaxUsers, room.ObjectCount, len(room.Users),
		room.LastActive, room.CreatedAt, room.UpdatedAt,
		userResponses,
	)

	c.JSON(http.StatusCreated, response)
}

// GetRoom gets a room by ID
// @Summary Get room by ID
// @Tags Rooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Room ID"
// @Success 200 {object} dto.RoomResponse
// @Failure 404 {object} map[string]string
// @Router /rooms/{id} [get]
func (h *RoomHandler) GetRoom(c *gin.Context) {
	roomID := c.Param("id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}

	room, err := h.roomService.GetRoomByID(roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get room"})
		return
	}
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	userResponses := make([]dto.UserResponse, len(room.Users))
	for i, ru := range room.Users {
		userResponses[i] = dto.ToUserResponse(ru.User.ID, ru.User.Username, ru.User.IsGuest, ru.User.LastSeen)
	}

	response := dto.ToRoomResponse(
		room.ID, room.Name, room.OwnerID, room.IsPrivate,
		room.InviteCode, room.MaxUsers, room.ObjectCount, len(room.Users),
		room.LastActive, room.CreatedAt, room.UpdatedAt,
		userResponses,
	)

	c.JSON(http.StatusOK, response)
}

// GetUserRooms gets all rooms for the current user
// @Summary Get user rooms
// @Tags Rooms
// @Produce json
// @Security BearerAuth
// @Success 200 {array} dto.RoomResponse
// @Failure 401 {object} map[string]string
// @Router /rooms [get]
func (h *RoomHandler) GetUserRooms(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	rooms, err := h.roomService.GetUserRooms(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get rooms"})
		return
	}

	responses := make([]dto.RoomResponse, len(rooms))
	for i, room := range rooms {
		userResponses := make([]dto.UserResponse, len(room.Users))
		for j, ru := range room.Users {
			userResponses[j] = dto.ToUserResponse(ru.User.ID, ru.User.Username, ru.User.IsGuest, ru.User.LastSeen)
		}
		responses[i] = dto.ToRoomResponse(
			room.ID, room.Name, room.OwnerID, room.IsPrivate,
			room.InviteCode, room.MaxUsers, room.ObjectCount, len(room.Users),
			room.LastActive, room.CreatedAt, room.UpdatedAt,
			userResponses,
		)
	}

	c.JSON(http.StatusOK, responses)
}

// UpdateRoom updates a room
// @Summary Update a room
// @Tags Rooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Room ID"
// @Param request body dto.UpdateRoomRequest true "Room updates"
// @Success 200 {object} dto.RoomResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /rooms/{id} [put]
func (h *RoomHandler) UpdateRoom(c *gin.Context) {
	roomID := c.Param("id")
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room, err := h.roomService.UpdateRoom(roomID, userID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	userResponses := make([]dto.UserResponse, len(room.Users))
	for i, ru := range room.Users {
		userResponses[i] = dto.ToUserResponse(ru.User.ID, ru.User.Username, ru.User.IsGuest, ru.User.LastSeen)
	}

	response := dto.ToRoomResponse(
		room.ID, room.Name, room.OwnerID, room.IsPrivate,
		room.InviteCode, room.MaxUsers, room.ObjectCount, len(room.Users),
		room.LastActive, room.CreatedAt, room.UpdatedAt,
		userResponses,
	)

	c.JSON(http.StatusOK, response)
}

// DeleteRoom deletes a room
// @Summary Delete a room
// @Tags Rooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Room ID"
// @Success 204 "No Content"
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /rooms/{id} [delete]
func (h *RoomHandler) DeleteRoom(c *gin.Context) {
	roomID := c.Param("id")
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	err := h.roomService.DeleteRoom(roomID, userID)
	if err != nil {
		if err.Error() == "room not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// JoinRoom joins a room
// @Summary Join a room
// @Tags Rooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Room ID"
// @Param request body dto.JoinRoomRequest true "Join request"
// @Success 200 {object} dto.RoomResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /rooms/{id}/join [post]
func (h *RoomHandler) JoinRoom(c *gin.Context) {
	roomID := c.Param("id")
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.JoinRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room, err := h.roomService.JoinRoom(roomID, userID, req.InviteCode)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	userResponses := make([]dto.UserResponse, len(room.Users))
	for i, ru := range room.Users {
		userResponses[i] = dto.ToUserResponse(ru.User.ID, ru.User.Username, ru.User.IsGuest, ru.User.LastSeen)
	}

	response := dto.ToRoomResponse(
		room.ID, room.Name, room.OwnerID, room.IsPrivate,
		room.InviteCode, room.MaxUsers, room.ObjectCount, len(room.Users),
		room.LastActive, room.CreatedAt, room.UpdatedAt,
		userResponses,
	)

	c.JSON(http.StatusOK, response)
}

// LeaveRoom leaves a room
// @Summary Leave a room
// @Tags Rooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Room ID"
// @Success 204 "No Content"
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /rooms/{id}/leave [post]
func (h *RoomHandler) LeaveRoom(c *gin.Context) {
	roomID := c.Param("id")
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	err := h.roomService.LeaveRoom(roomID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetRoomUsers gets all users in a room
// @Summary Get room users
// @Tags Rooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Room ID"
// @Success 200 {array} models.RoomUser
// @Failure 404 {object} map[string]string
// @Router /rooms/{id}/users [get]
func (h *RoomHandler) GetRoomUsers(c *gin.Context) {
	roomID := c.Param("id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}

	users, err := h.roomService.GetRoomUsers(roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get users"})
		return
	}

	c.JSON(http.StatusOK, users)
}
