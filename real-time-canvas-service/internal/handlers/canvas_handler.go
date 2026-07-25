package handlers

import (
	"net/http"

	"real-time-canvas/real-time-canvas-service/internal/models"
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
// @Summary Create canvas object
// @Tags Canvas
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Param request body models.CreateObjectRequest true "Object details"
// @Success 201 {object} models.CanvasObjectResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /rooms/{roomId}/objects [post]
func (h *CanvasHandler) CreateObject(c *gin.Context) {
	roomID := c.Param("roomId")
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.CreateObjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	obj, err := h.canvasService.CreateObject(userID, roomID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, obj.ToResponse())
}

// GetObjects gets all objects in a room
// @Summary Get room objects
// @Tags Canvas
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Param type query string false "Filter by object type"
// @Success 200 {array} models.CanvasObjectResponse
// @Failure 404 {object} map[string]string
// @Router /rooms/{roomId}/objects [get]
func (h *CanvasHandler) GetObjects(c *gin.Context) {
	roomID := c.Param("roomId")
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

	responses := make([]models.CanvasObjectResponse, len(objects))
	for i, obj := range objects {
		responses[i] = obj.ToResponse()
	}

	c.JSON(http.StatusOK, responses)
}

// GetObject gets a single canvas object
// @Summary Get canvas object
// @Tags Canvas
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Param objectId path string true "Object ID"
// @Success 200 {object} models.CanvasObjectResponse
// @Failure 404 {object} map[string]string
// @Router /rooms/{roomId}/objects/{objectId} [get]
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

	c.JSON(http.StatusOK, obj.ToResponse())
}

// UpdateObject updates a canvas object
// @Summary Update canvas object
// @Tags Canvas
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Param objectId path string true "Object ID"
// @Param request body models.UpdateObjectRequest true "Object updates"
// @Success 200 {object} models.CanvasObjectResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /rooms/{roomId}/objects/{objectId} [put]
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

	var req models.UpdateObjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	obj, err := h.canvasService.UpdateObject(objectID, userID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, obj.ToResponse())
}

// DeleteObject deletes a canvas object
// @Summary Delete canvas object
// @Tags Canvas
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Param objectId path string true "Object ID"
// @Success 204 "No Content"
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /rooms/{roomId}/objects/{objectId} [delete]
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
// @Summary Batch create canvas objects
// @Tags Canvas
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Param request body models.BatchCreateObjectsRequest true "Objects to create"
// @Success 201 {array} models.CanvasObjectResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /rooms/{roomId}/objects/batch [post]
func (h *CanvasHandler) BatchCreateObjects(c *gin.Context) {
	roomID := c.Param("roomId")
	userID := c.GetString("userID")

	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room id is required"})
		return
	}
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.BatchCreateObjectsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	objects, err := h.canvasService.BatchCreateObjects(userID, roomID, &req)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	responses := make([]models.CanvasObjectResponse, len(objects))
	for i, obj := range objects {
		responses[i] = obj.ToResponse()
	}

	c.JSON(http.StatusCreated, responses)
}

// ClearRoomObjects clears all objects in a room
// @Summary Clear room objects
// @Tags Canvas
// @Produce json
// @Security BearerAuth
// @Param roomId path string true "Room ID"
// @Success 204 "No Content"
// @Failure 403 {object} map[string]string
// @Router /rooms/{roomId}/objects/clear [post]
func (h *CanvasHandler) ClearRoomObjects(c *gin.Context) {
	roomID := c.Param("roomId")
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
