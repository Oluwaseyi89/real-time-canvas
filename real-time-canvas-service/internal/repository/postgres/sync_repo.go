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

// Create creates a new sync event
func (r *SyncRepository) Create(ctx context.Context, event *models.SyncEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
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
