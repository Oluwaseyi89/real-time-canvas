package services

import (
	"context"
	"encoding/json"
	"errors"

	"real-time-canvas/real-time-canvas-service/internal/models"
	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
)

// SyncService handles offline sync event business logic
type SyncService struct {
	syncRepo *postgres.SyncRepository
	roomRepo *postgres.RoomRepository
}

// NewSyncService creates a new sync service
func NewSyncService(syncRepo *postgres.SyncRepository, roomRepo *postgres.RoomRepository) *SyncService {
	return &SyncService{
		syncRepo: syncRepo,
		roomRepo: roomRepo,
	}
}

// CreateEvent records a sync event for a room, assigning it the next
// room-scoped version number (max existing version + 1) so reconnecting
// clients can ask for everything after a given version.
func (s *SyncService) CreateEvent(userID, roomID string, req *dto.CreateSyncEventRequest) (*models.SyncEvent, error) {
	ctx := context.Background()

	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	payloadJSON, err := json.Marshal(req.Payload)
	if err != nil {
		return nil, err
	}

	maxVersion, err := s.syncRepo.GetMaxVersion(ctx, roomID)
	if err != nil {
		return nil, err
	}

	event := &models.SyncEvent{
		RoomID:    roomID,
		UserID:    userID,
		EventType: req.EventType,
		Payload:   payloadJSON,
		Version:   maxVersion + 1,
	}

	if err := s.syncRepo.Create(ctx, event); err != nil {
		return nil, err
	}

	return event, nil
}

// GetEventsSince returns all sync events for a room with a version greater
// than `since`, ordered oldest-first — what a reconnecting client missed.
func (s *SyncService) GetEventsSince(userID, roomID string, since int) ([]models.SyncEvent, error) {
	ctx := context.Background()

	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	return s.syncRepo.FindByRoomIDSince(ctx, roomID, since)
}
