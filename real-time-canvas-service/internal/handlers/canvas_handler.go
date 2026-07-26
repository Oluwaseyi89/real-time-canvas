package handlers

import (
	"net/http"

	"real-time-canvas/real-time-canvas-service/internal/models"
	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/services"

	"github.com/gin-gonic/gin"
)

// CanvasHandler handles canvas endpoints
type CanvasHandler struct {
	canvasService *services.CanvasService
}

// NewCanvasHandler creates a new canvas handler
func NewCanvasHandler(canvasService *services.CanvasService) *CanvasHandler {
	return &CanvasHandler{canvasService: canvasService}
}

// CreateObject creates a new canvas object
func (h *CanvasHandler) CreateObject(c *gin.Context) {
	roomID := c.Param("id") // Changed from "roomId" to "id"
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.CreateObjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	obj, err := h.canvasService.CreateObject(userID, roomID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	response := dto.ToCanvasObjectResponse(
		obj.ID, obj.RoomID, obj.UserID, obj.ObjectType,
		obj.Data, obj.PositionX, obj.PositionY,
		obj.Width, obj.Height, obj.Rotation,
		obj.ZIndex, obj.Version,
		obj.CreatedAt, obj.UpdatedAt,
		obj.User.Username,
	)

	c.JSON(http.StatusCreated, response)
}

// GetObjects gets all objects in a room
func (h *CanvasHandler) GetObjects(c *gin.Context) {
	roomID := c.Param("id") // Changed from "roomId" to "id"
	objectType := c.Query("type")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}

	var objects []models.CanvasObject
	var err error

	if objectType != "" {
		objects, err = h.canvasService.GetRoomObjectsByType(roomID, objectType)
	} else {
		objects, err = h.canvasService.GetRoomObjects(roomID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get objects"})
		return
	}

	responses := make([]dto.CanvasObjectResponse, len(objects))
	for i, obj := range objects {
		responses[i] = dto.ToCanvasObjectResponse(
			obj.ID, obj.RoomID, obj.UserID, obj.ObjectType,
			obj.Data, obj.PositionX, obj.PositionY,
			obj.Width, obj.Height, obj.Rotation,
			obj.ZIndex, obj.Version,
			obj.CreatedAt, obj.UpdatedAt,
			obj.User.Username,
		)
	}

	c.JSON(http.StatusOK, responses)
}

// GetObject gets a single canvas object
func (h *CanvasHandler) GetObject(c *gin.Context) {
	objectID := c.Param("objectId")

	if objectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "object id is required"})
		return
	}

	obj, err := h.canvasService.GetObjectByID(objectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get object"})
		return
	}
	if obj == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "object not found"})
		return
	}

	response := dto.ToCanvasObjectResponse(
		obj.ID, obj.RoomID, obj.UserID, obj.ObjectType,
		obj.Data, obj.PositionX, obj.PositionY,
		obj.Width, obj.Height, obj.Rotation,
		obj.ZIndex, obj.Version,
		obj.CreatedAt, obj.UpdatedAt,
		obj.User.Username,
	)

	c.JSON(http.StatusOK, response)
}

// UpdateObject updates a canvas object
func (h *CanvasHandler) UpdateObject(c *gin.Context) {
	objectID := c.Param("objectId")
	userID := c.GetString("userID")

	if objectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "object id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateObjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	obj, err := h.canvasService.UpdateObject(objectID, userID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	if obj == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "object not found"})
		return
	}

	response := dto.ToCanvasObjectResponse(
		obj.ID, obj.RoomID, obj.UserID, obj.ObjectType,
		obj.Data, obj.PositionX, obj.PositionY,
		obj.Width, obj.Height, obj.Rotation,
		obj.ZIndex, obj.Version,
		obj.CreatedAt, obj.UpdatedAt,
		obj.User.Username,
	)

	c.JSON(http.StatusOK, response)
}

// DeleteObject deletes a canvas object
func (h *CanvasHandler) DeleteObject(c *gin.Context) {
	objectID := c.Param("objectId")
	userID := c.GetString("userID")

	if objectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "object id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	err := h.canvasService.DeleteObject(objectID, userID)
	if err != nil {
		if err.Error() == "object not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// BatchCreateObjects creates multiple canvas objects
func (h *CanvasHandler) BatchCreateObjects(c *gin.Context) {
	roomID := c.Param("id") // Changed from "roomId" to "id"
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.BatchCreateObjectsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objects, err := h.canvasService.BatchCreateObjects(userID, roomID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	responses := make([]dto.CanvasObjectResponse, len(objects))
	for i, obj := range objects {
		responses[i] = dto.ToCanvasObjectResponse(
			obj.ID, obj.RoomID, obj.UserID, obj.ObjectType,
			obj.Data, obj.PositionX, obj.PositionY,
			obj.Width, obj.Height, obj.Rotation,
			obj.ZIndex, obj.Version,
			obj.CreatedAt, obj.UpdatedAt,
			obj.User.Username,
		)
	}

	c.JSON(http.StatusCreated, responses)
}

// ClearRoomObjects clears all objects in a room
func (h *CanvasHandler) ClearRoomObjects(c *gin.Context) {
	roomID := c.Param("id") // Changed from "roomId" to "id"
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	err := h.canvasService.ClearRoomObjects(roomID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
