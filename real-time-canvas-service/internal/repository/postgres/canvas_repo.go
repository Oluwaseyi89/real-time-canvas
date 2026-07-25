package postgres

import (
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
func (r *CanvasRepository) Create(obj *models.CanvasObject) error {
	return r.db.Create(obj).Error
}

// FindByID finds a canvas object by ID
func (r *CanvasRepository) FindByID(id string) (*models.CanvasObject, error) {
	var obj models.CanvasObject
	err := r.db.Preload("User").Where("id = ?", id).First(&obj).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &obj, err
}

// FindByRoomID finds all objects in a room
func (r *CanvasRepository) FindByRoomID(roomID string) ([]models.CanvasObject, error) {
	var objects []models.CanvasObject
	err := r.db.Preload("User").
		Where("room_id = ?", roomID).
		Order("z_index ASC").
		Find(&objects).Error
	return objects, err
}

// FindByRoomIDAndType finds objects in a room by type
func (r *CanvasRepository) FindByRoomIDAndType(roomID, objectType string) ([]models.CanvasObject, error) {
	var objects []models.CanvasObject
	err := r.db.Preload("User").
		Where("room_id = ? AND object_type = ?", roomID, objectType).
		Order("z_index ASC").
		Find(&objects).Error
	return objects, err
}

// Update updates a canvas object
func (r *CanvasRepository) Update(obj *models.CanvasObject) error {
	return r.db.Save(obj).Error
}

// Delete deletes a canvas object
func (r *CanvasRepository) Delete(id string) error {
	return r.db.Delete(&models.CanvasObject{}, "id = ?", id).Error
}

// DeleteByRoomID deletes all objects in a room
func (r *CanvasRepository) DeleteByRoomID(roomID string) error {
	return r.db.Delete(&models.CanvasObject{}, "room_id = ?", roomID).Error
}

// GetCountByRoomID gets the count of objects in a room
func (r *CanvasRepository) GetCountByRoomID(roomID string) (int64, error) {
	var count int64
	err := r.db.Model(&models.CanvasObject{}).Where("room_id = ?", roomID).Count(&count).Error
	return count, err
}

// BatchCreate creates multiple canvas objects
func (r *CanvasRepository) BatchCreate(objects []models.CanvasObject) error {
	return r.db.Create(&objects).Error
}

// BatchDelete deletes multiple canvas objects
func (r *CanvasRepository) BatchDelete(ids []string) error {
	return r.db.Delete(&models.CanvasObject{}, "id IN ?", ids).Error
}

// GetZIndexMax gets the maximum z-index in a room
func (r *CanvasRepository) GetZIndexMax(roomID string) (int, error) {
	var max int
	err := r.db.Model(&models.CanvasObject{}).
		Where("room_id = ?", roomID).
		Select("COALESCE(MAX(z_index), 0)").
		Scan(&max).Error
	return max, err
}
