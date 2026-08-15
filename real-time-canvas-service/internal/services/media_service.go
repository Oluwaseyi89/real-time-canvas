package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"

	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
	"real-time-canvas/real-time-canvas-service/internal/storage"

	"github.com/google/uuid"
)

// allowedMediaPrefixes restricts uploads to what the canvas actually
// renders (ImageTool/AudioTool) — anything else (video, pdf, executables,
// ...) is rejected rather than silently accepted and never used.
var allowedMediaPrefixes = []string{"image/", "audio/"}

// MediaUploadResult is what the handler returns to the client.
type MediaUploadResult struct {
	URL         string
	Filename    string
	ContentType string
	Size        int64
}

// MediaService validates and stores uploaded canvas media (images/audio).
type MediaService struct {
	storage   storage.Storage
	roomRepo  *postgres.RoomRepository
	maxSizeMB int
}

// NewMediaService creates a new media service.
func NewMediaService(store storage.Storage, roomRepo *postgres.RoomRepository, maxSizeMB int) *MediaService {
	return &MediaService{
		storage:   store,
		roomRepo:  roomRepo,
		maxSizeMB: maxSizeMB,
	}
}

// MaxUploadBytes is the configured per-file size limit, for the handler to
// enforce before it even starts reading the multipart body.
func (s *MediaService) MaxUploadBytes() int64 {
	return int64(s.maxSizeMB) * 1024 * 1024
}

// Upload validates the file belongs to an allowed media type, stores it
// under a room-namespaced key via the configured Storage backend, and
// returns the URL clients can load it from.
func (s *MediaService) Upload(ctx context.Context, userID, roomID, filename, contentType string, size int64, reader io.Reader) (*MediaUploadResult, error) {
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	if !isAllowedMediaType(contentType) {
		return nil, fmt.Errorf("unsupported content type: %s (only image/* and audio/* are accepted)", contentType)
	}

	if size > s.MaxUploadBytes() {
		return nil, fmt.Errorf("file exceeds maximum upload size of %dMB", s.maxSizeMB)
	}

	key := fmt.Sprintf("%s/%s%s", roomID, uuid.NewString(), extensionFor(filename))

	url, err := s.storage.Upload(ctx, key, reader, size, contentType)
	if err != nil {
		return nil, fmt.Errorf("store file: %w", err)
	}

	return &MediaUploadResult{
		URL:         url,
		Filename:    filename,
		ContentType: contentType,
		Size:        size,
	}, nil
}

func isAllowedMediaType(contentType string) bool {
	for _, prefix := range allowedMediaPrefixes {
		if strings.HasPrefix(contentType, prefix) {
			return true
		}
	}
	return false
}

func extensionFor(filename string) string {
	if idx := strings.LastIndex(filename, "."); idx != -1 {
		return filename[idx:]
	}
	return ""
}
