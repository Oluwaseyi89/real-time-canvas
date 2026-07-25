package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        string         `gorm:"primaryKey;type:uuid" json:"id"`
	Username  string         `gorm:"uniqueIndex;not null" json:"username"`
	Email     string         `gorm:"uniqueIndex" json:"email,omitempty"`
	Password  string         `json:"-"` // Hashed password
	IsGuest   bool           `gorm:"default:true" json:"isGuest"`
	LastSeen  time.Time      `json:"lastSeen"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserResponse is the user data sent to clients
type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	IsGuest  bool   `json:"isGuest"`
	LastSeen string `json:"lastSeen,omitempty"`
}

// ToResponse converts User to UserResponse
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:       u.ID,
		Username: u.Username,
		IsGuest:  u.IsGuest,
		LastSeen: u.LastSeen.Format(time.RFC3339),
	}
}

// CreateUserRequest represents user creation request
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"omitempty,email"`
	Password string `json:"password" binding:"omitempty,min=6"`
	IsGuest  bool   `json:"isGuest"`
}

// LoginRequest represents login request
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password"`
}

// GuestLoginRequest represents guest login request
type GuestLoginRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
}

// BeforeCreate hook to generate UUID
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	if u.LastSeen.IsZero() {
		u.LastSeen = time.Now()
	}
	return nil
}
