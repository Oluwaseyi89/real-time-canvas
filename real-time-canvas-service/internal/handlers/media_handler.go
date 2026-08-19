package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"real-time-canvas/real-time-canvas-service/internal/services"

	"github.com/gin-gonic/gin"
)

// MediaHandler handles canvas media (image/audio) upload endpoints.
type MediaHandler struct {
	mediaService *services.MediaService
}

// NewMediaHandler creates a new media handler.
func NewMediaHandler(mediaService *services.MediaService) *MediaHandler {
	return &MediaHandler{mediaService: mediaService}
}

// UploadMedia handles a multipart file upload and stores it via the
// configured Storage backend (S3 if configured, local disk otherwise).
func (h *MediaHandler) UploadMedia(c *gin.Context) {
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

	// Reject oversized bodies before Gin buffers the multipart form into
	// memory/tmp files at all, rather than after MediaService.Upload
	// rejects it — a MaxBytesReader trips as soon as the body exceeds the
	// limit instead of only after the whole file has already been read.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.mediaService.MaxUploadBytes()+1024)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		// MaxBytesReader aborts the underlying read with this exact message
		// once the body exceeds the limit — Gin's multipart parser then
		// surfaces it here as a generic form-parsing error, so without this
		// check an oversized upload would confusingly report as "no file".
		if strings.Contains(err.Error(), "http: request body too large") {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": fmt.Sprintf("file exceeds maximum upload size of %dMB", h.mediaService.MaxUploadBytes()/(1024*1024)),
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required (multipart field \"file\")"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read uploaded file"})
		return
	}
	defer func() { _ = file.Close() }()

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	result, err := h.mediaService.Upload(c.Request.Context(), userID, roomID, fileHeader.Filename, contentType, fileHeader.Size, file)
	if err != nil {
		if err.Error() == "user is not in room" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"url":         result.URL,
		"filename":    result.Filename,
		"contentType": result.ContentType,
		"size":        result.Size,
	})
}
