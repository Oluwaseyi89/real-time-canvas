package postgres

import (
	"context"

	"real-time-canvas/real-time-canvas-service/internal/models"

	"gorm.io/gorm"
)

// SyncRepository handles sync event database operations
type SyncRepository struct {
	db *gorm.DB
}

// NewSyncRepository creates a new sync repository
func NewSyncRepository(db *gorm.DB) *SyncRepository {
	return &SyncRepository{db: db}
}

// FindByRoomIDSince finds all sync events in a room with version greater than since
func (r *SyncRepository) FindByRoomIDSince(ctx context.Context, roomID string, since int) ([]models.SyncEvent, error) {
	var events []models.SyncEvent
	err := r.db.WithContext(ctx).
		Where("room_id = ? AND version > ?", roomID, since).
		Order("version ASC").
		Find(&events).Error
	return events, err
}

// GetMaxVersion gets the highest event version recorded for a room
func (r *SyncRepository) GetMaxVersion(ctx context.Context, roomID string) (int, error) {
	var max int
	err := r.db.WithContext(ctx).
		Model(&models.SyncEvent{}).
		Where("room_id = ?", roomID).
		Select("COALESCE(MAX(version), 0)").
		Scan(&max).Error
	return max, err
}

// CreateWithNextVersion assigns the event the next room-scoped version (max
// existing version + 1) and persists it. Centralizes version assignment so
// every write path — explicit client sync writes via SyncService, and
// automatic event recording from CanvasService on every canvas mutation —
// stays consistent instead of duplicating the read-max-then-insert logic.
func (r *SyncRepository) CreateWithNextVersion(ctx context.Context, event *models.SyncEvent) error {
	maxVersion, err := r.GetMaxVersion(ctx, event.RoomID)
	if err != nil {
		return err
	}
	event.Version = maxVersion + 1
	return r.db.WithContext(ctx).Create(event).Error
}
