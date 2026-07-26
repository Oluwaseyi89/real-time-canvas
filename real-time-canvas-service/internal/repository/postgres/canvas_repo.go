package postgres

import (
	"context"
	"errors"

	"real-time-canvas/real-time-canvas-service/internal/models"

	"gorm.io/gorm"
)

// CanvasRepository handles canvas object database operations
type CanvasRepository struct {
	db *gorm.DB
}

// NewCanvasRepository creates a new canvas repository
func NewCanvasRepository(db *gorm.DB) *CanvasRepository {
	return &CanvasRepository{db: db}
}

// Create creates a new canvas object
func (r *CanvasRepository) Create(ctx context.Context, obj *models.CanvasObject) error {
	return r.db.WithContext(ctx).Create(obj).Error
}

// FindByID finds a canvas object by ID
func (r *CanvasRepository) FindByID(ctx context.Context, id string) (*models.CanvasObject, error) {
	var obj models.CanvasObject
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ?", id).
		First(&obj).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &obj, err
}

// FindByRoomID finds all objects in a room
func (r *CanvasRepository) FindByRoomID(ctx context.Context, roomID string) ([]models.CanvasObject, error) {
	var objects []models.CanvasObject
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("room_id = ?", roomID).
		Where("deleted_at IS NULL").
		Order("z_index ASC").
		Find(&objects).Error
	return objects, err
}

// FindByRoomIDAndType finds objects in a room by type
func (r *CanvasRepository) FindByRoomIDAndType(ctx context.Context, roomID, objectType string) ([]models.CanvasObject, error) {
	var objects []models.CanvasObject
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("room_id = ? AND object_type = ?", roomID, objectType).
		Where("deleted_at IS NULL").
		Order("z_index ASC").
		Find(&objects).Error
	return objects, err
}

// Update updates a canvas object
func (r *CanvasRepository) Update(ctx context.Context, obj *models.CanvasObject) error {
	return r.db.WithContext(ctx).Save(obj).Error
}

// Delete deletes a canvas object
func (r *CanvasRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.CanvasObject{}, "id = ?", id).Error
}

// DeleteByRoomID deletes all objects in a room
func (r *CanvasRepository) DeleteByRoomID(ctx context.Context, roomID string) error {
	return r.db.WithContext(ctx).
		Delete(&models.CanvasObject{}, "room_id = ?", roomID).Error
}

// GetCountByRoomID gets the count of objects in a room
func (r *CanvasRepository) GetCountByRoomID(ctx context.Context, roomID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.CanvasObject{}).
		Where("room_id = ?", roomID).
		Where("deleted_at IS NULL").
		Count(&count).Error
	return count, err
}

// BatchCreate creates multiple canvas objects
func (r *CanvasRepository) BatchCreate(ctx context.Context, objects []models.CanvasObject) error {
	return r.db.WithContext(ctx).Create(&objects).Error
}

// BatchDelete deletes multiple canvas objects
func (r *CanvasRepository) BatchDelete(ctx context.Context, ids []string) error {
	return r.db.WithContext(ctx).
		Delete(&models.CanvasObject{}, "id IN ?", ids).Error
}

// GetZIndexMax gets the maximum z-index in a room
func (r *CanvasRepository) GetZIndexMax(ctx context.Context, roomID string) (int, error) {
	var max int
	err := r.db.WithContext(ctx).
		Model(&models.CanvasObject{}).
		Where("room_id = ?", roomID).
		Select("COALESCE(MAX(z_index), 0)").
		Scan(&max).Error
	return max, err
}
