package postgres

import (
	"context"
	"errors"
	"time"

	"real-time-canvas/real-time-canvas-service/internal/models"

	"gorm.io/gorm"
)

// RoomRepository handles room database operations
type RoomRepository struct {
	db *gorm.DB
}

// NewRoomRepository creates a new room repository
func NewRoomRepository(db *gorm.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

// Create creates a new room
func (r *RoomRepository) Create(ctx context.Context, room *models.Room) error {
	return r.db.WithContext(ctx).Create(room).Error
}

// FindByID finds a room by ID with users
func (r *RoomRepository) FindByID(ctx context.Context, id string) (*models.Room, error) {
	var room models.Room
	err := r.db.WithContext(ctx).
		Preload("Users.User").
		Where("id = ?", id).
		First(&room).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &room, err
}

// FindByInviteCode finds a room by invite code
func (r *RoomRepository) FindByInviteCode(ctx context.Context, code string) (*models.Room, error) {
	var room models.Room
	err := r.db.WithContext(ctx).
		Preload("Users.User").
		Where("invite_code = ?", code).
		First(&room).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &room, err
}

// FindByUserID finds all rooms for a user with pagination
func (r *RoomRepository) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]models.Room, int64, error) {
	var rooms []models.Room
	var total int64

	query := r.db.WithContext(ctx).
		Joins("JOIN room_users ON room_users.room_id = rooms.id").
		Where("room_users.user_id = ?", userID)

	// Count total
	if err := query.Model(&models.Room{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := query.
		Preload("Users.User").
		Limit(limit).
		Offset(offset).
		Order("rooms.last_active DESC").
		Find(&rooms).Error

	return rooms, total, err
}

// Update updates a room
func (r *RoomRepository) Update(ctx context.Context, room *models.Room) error {
	return r.db.WithContext(ctx).Save(room).Error
}

// Delete deletes a room
func (r *RoomRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Room{}, "id = ?", id).Error
}

// AddUser adds a user to a room
func (r *RoomRepository) AddUser(ctx context.Context, roomID, userID, role string) error {
	roomUser := models.RoomUser{
		RoomID:     roomID,
		UserID:     userID,
		Role:       role,
		JoinedAt:   time.Now().UTC(),
		LastActive: time.Now().UTC(),
	}
	return r.db.WithContext(ctx).Create(&roomUser).Error
}

// RemoveUser removes a user from a room
func (r *RoomRepository) RemoveUser(ctx context.Context, roomID, userID string) error {
	return r.db.WithContext(ctx).
		Delete(&models.RoomUser{}, "room_id = ? AND user_id = ?", roomID, userID).Error
}

// GetUserRole gets a user's role in a room
func (r *RoomRepository) GetUserRole(ctx context.Context, roomID, userID string) (string, error) {
	var roomUser models.RoomUser
	err := r.db.WithContext(ctx).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		First(&roomUser).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	return roomUser.Role, err
}

// IsUserInRoom checks if a user is in a room
func (r *RoomRepository) IsUserInRoom(ctx context.Context, roomID, userID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.RoomUser{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetRoomUsers gets all users in a room
func (r *RoomRepository) GetRoomUsers(ctx context.Context, roomID string) ([]models.RoomUser, error) {
	var users []models.RoomUser
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("room_id = ?", roomID).
		Order("joined_at ASC").
		Find(&users).Error
	return users, err
}

// IncrementObjectCount increments the object count for a room
func (r *RoomRepository) IncrementObjectCount(ctx context.Context, roomID string, delta int) error {
	return r.db.WithContext(ctx).
		Model(&models.Room{}).
		Where("id = ?", roomID).
		Update("object_count", gorm.Expr("object_count + ?", delta)).Error
}

// UpdateLastActive updates the last active timestamp
func (r *RoomRepository) UpdateLastActive(ctx context.Context, roomID string) error {
	return r.db.WithContext(ctx).
		Model(&models.Room{}).
		Where("id = ?", roomID).
		Update("last_active", time.Now().UTC()).Error
}
