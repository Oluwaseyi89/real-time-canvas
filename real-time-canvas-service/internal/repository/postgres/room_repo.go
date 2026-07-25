package postgres

import (
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
func (r *RoomRepository) Create(room *models.Room) error {
	return r.db.Create(room).Error
}

// FindByID finds a room by ID with users
func (r *RoomRepository) FindByID(id string) (*models.Room, error) {
	var room models.Room
	err := r.db.Preload("Users.User").Where("id = ?", id).First(&room).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &room, err
}

// FindByInviteCode finds a room by invite code
func (r *RoomRepository) FindByInviteCode(code string) (*models.Room, error) {
	var room models.Room
	err := r.db.Preload("Users.User").Where("invite_code = ?", code).First(&room).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &room, err
}

// FindByUserID finds all rooms for a user
func (r *RoomRepository) FindByUserID(userID string) ([]models.Room, error) {
	var rooms []models.Room
	err := r.db.
		Joins("JOIN room_users ON room_users.room_id = rooms.id").
		Where("room_users.user_id = ?", userID).
		Preload("Users.User").
		Find(&rooms).Error
	return rooms, err
}

// Update updates a room
func (r *RoomRepository) Update(room *models.Room) error {
	return r.db.Save(room).Error
}

// Delete deletes a room
func (r *RoomRepository) Delete(id string) error {
	return r.db.Delete(&models.Room{}, "id = ?", id).Error
}

// AddUser adds a user to a room
func (r *RoomRepository) AddUser(roomID, userID, role string) error {
	roomUser := models.RoomUser{
		RoomID:     roomID,
		UserID:     userID,
		Role:       role,
		JoinedAt:   time.Now(),
		LastActive: time.Now(),
	}
	return r.db.Create(&roomUser).Error
}

// RemoveUser removes a user from a room
func (r *RoomRepository) RemoveUser(roomID, userID string) error {
	return r.db.Delete(&models.RoomUser{}, "room_id = ? AND user_id = ?", roomID, userID).Error
}

// GetUserRole gets a user's role in a room
func (r *RoomRepository) GetUserRole(roomID, userID string) (string, error) {
	var roomUser models.RoomUser
	err := r.db.Where("room_id = ? AND user_id = ?", roomID, userID).First(&roomUser).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	return roomUser.Role, err
}

// IsUserInRoom checks if a user is in a room
func (r *RoomRepository) IsUserInRoom(roomID, userID string) (bool, error) {
	var count int64
	err := r.db.Model(&models.RoomUser{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Count(&count).Error
	return count > 0, err
}

// GetRoomUsers gets all users in a room
func (r *RoomRepository) GetRoomUsers(roomID string) ([]models.RoomUser, error) {
	var users []models.RoomUser
	err := r.db.Preload("User").Where("room_id = ?", roomID).Find(&users).Error
	return users, err
}

// IncrementObjectCount increments the object count for a room
func (r *RoomRepository) IncrementObjectCount(roomID string, delta int) error {
	return r.db.Model(&models.Room{}).
		Where("id = ?", roomID).
		Update("object_count", gorm.Expr("object_count + ?", delta)).Error
}

// UpdateLastActive updates the last active timestamp
func (r *RoomRepository) UpdateLastActive(roomID string) error {
	return r.db.Model(&models.Room{}).
		Where("id = ?", roomID).
		Update("last_active", time.Now()).Error
}
