package postgres

import (
	"errors"
	"time"

	"real-time-canvas/real-time-canvas-service/internal/models"

	"gorm.io/gorm"
)

// UserRepository handles user database operations
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

// FindByID finds a user by ID
func (r *UserRepository) FindByID(id string) (*models.User, error) {
	var user models.User
	err := r.db.Where("id = ?", id).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &user, err
}

// FindByUsername finds a user by username
func (r *UserRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &user, err
}

// FindByEmail finds a user by email
func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &user, err
}

// Update updates a user
func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

// Delete deletes a user
func (r *UserRepository) Delete(id string) error {
	return r.db.Delete(&models.User{}, "id = ?", id).Error
}

// UpdateLastSeen updates the last seen timestamp
func (r *UserRepository) UpdateLastSeen(id string) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("last_seen", time.Now()).Error
}

// GetActiveUsers returns users active within the last 5 minutes
func (r *UserRepository) GetActiveUsers() ([]models.User, error) {
	var users []models.User
	fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
	err := r.db.Where("last_seen > ?", fiveMinutesAgo).Find(&users).Error
	return users, err
}

// FindOrCreateGuest finds or creates a guest user
func (r *UserRepository) FindOrCreateGuest(username string) (*models.User, error) {
	var user models.User
	err := r.db.Where("username = ? AND is_guest = ?", username, true).First(&user).Error
	if err == nil {
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create new guest user
	user = models.User{
		Username: username,
		IsGuest:  true,
		LastSeen: time.Now(),
	}
	err = r.db.Create(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Exists checks if a user exists
func (r *UserRepository) Exists(id string) (bool, error) {
	var count int64
	err := r.db.Model(&models.User{}).Where("id = ?", id).Count(&count).Error
	return count > 0, err
}
