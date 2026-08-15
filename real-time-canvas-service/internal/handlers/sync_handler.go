package handlers

import (
	"net/http"
	"strconv"

	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/services"

	"github.com/gin-gonic/gin"
)

// SyncHandler handles offline sync endpoints
type SyncHandler struct {
	syncService *services.SyncService
}

// NewSyncHandler creates a new sync handler
func NewSyncHandler(syncService *services.SyncService) *SyncHandler {
	return &SyncHandler{syncService: syncService}
}

// CreateEvent records a sync event for a room (a reconnecting client's
// queued offline operation being replayed against the server)
func (h *SyncHandler) CreateEvent(c *gin.Context) {
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

	var req dto.CreateSyncEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.syncService.CreateEvent(userID, roomID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	response := dto.ToSyncEventResponse(
		event.ID, event.RoomID, event.UserID, event.EventType,
		event.Payload, event.Version, event.CreatedAt,
	)

	c.JSON(http.StatusCreated, response)
}

// GetEvents returns sync events a reconnecting client missed, i.e. every
// event recorded after ?since=<version> (default 0, meaning "everything").
func (h *SyncHandler) GetEvents(c *gin.Context) {
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

	since := 0
	if sinceParam := c.Query("since"); sinceParam != "" {
		parsed, err := strconv.Atoi(sinceParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "since must be an integer"})
			return
		}
		since = parsed
	}

	events, err := h.syncService.GetEventsSince(userID, roomID, since)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	responses := make([]dto.SyncEventResponse, len(events))
	for i, event := range events {
		responses[i] = dto.ToSyncEventResponse(
			event.ID, event.RoomID, event.UserID, event.EventType,
			event.Payload, event.Version, event.CreatedAt,
		)
	}

	c.JSON(http.StatusOK, responses)
}
