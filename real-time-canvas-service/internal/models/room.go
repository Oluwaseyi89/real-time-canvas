package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Room represents a collaborative canvas room
type Room struct {
	ID          string         `gorm:"primaryKey;type:uuid" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	OwnerID     string         `gorm:"type:uuid;not null" json:"ownerId"`
	IsPrivate   bool           `gorm:"default:false" json:"isPrivate"`
	InviteCode  string         `gorm:"uniqueIndex" json:"inviteCode,omitempty"`
	MaxUsers    int            `gorm:"default:50" json:"maxUsers"`
	ObjectCount int            `gorm:"default:0" json:"objectCount"`
	LastActive  time.Time      `json:"lastActive"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Owner   User           `gorm:"foreignKey:OwnerID" json:"-"`
	Users   []RoomUser     `gorm:"foreignKey:RoomID" json:"users,omitempty"`
	Objects []CanvasObject `gorm:"foreignKey:RoomID" json:"objects,omitempty"`
}

// RoomUser represents a user's membership in a room
type RoomUser struct {
	RoomID     string    `gorm:"type:uuid;primaryKey" json:"roomId"`
	UserID     string    `gorm:"type:uuid;primaryKey" json:"userId"`
	Role       string    `gorm:"default:'editor'" json:"role"` // owner, editor, viewer
	JoinedAt   time.Time `json:"joinedAt"`
	LastActive time.Time `json:"lastActive"`
	User       User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// RoomResponse is the room data sent to clients
type RoomResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	OwnerID     string                 `json:"ownerId"`
	IsPrivate   bool                   `json:"isPrivate"`
	InviteCode  string                 `json:"inviteCode,omitempty"`
	MaxUsers    int                    `json:"maxUsers"`
	ObjectCount int                    `json:"objectCount"`
	UserCount   int                    `json:"userCount"`
	LastActive  string                 `json:"lastActive"`
	CreatedAt   string                 `json:"createdAt"`
	UpdatedAt   string                 `json:"updatedAt"`
	Users       []UserResponse         `json:"users,omitempty"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
}

// CreateRoomRequest represents room creation request
type CreateRoomRequest struct {
	Name      string `json:"name" binding:"required,min=3,max=100"`
	IsPrivate bool   `json:"isPrivate"`
	MaxUsers  int    `json:"maxUsers" binding:"omitempty,min=1,max=200"`
}

// JoinRoomRequest represents room join request
type JoinRoomRequest struct {
	RoomID     string `json:"roomId" binding:"required"`
	InviteCode string `json:"inviteCode"`
}

// UpdateRoomRequest represents room update request
type UpdateRoomRequest struct {
	Name     string `json:"name" binding:"omitempty,min=3,max=100"`
	MaxUsers int    `json:"maxUsers" binding:"omitempty,min=1,max=200"`
}

// ToResponse converts Room to RoomResponse
func (r *Room) ToResponse() RoomResponse {
	userCount := len(r.Users)
	users := make([]UserResponse, 0, userCount)
	for _, ru := range r.Users {
		users = append(users, ru.User.ToResponse())
	}

	return RoomResponse{
		ID:          r.ID,
		Name:        r.Name,
		OwnerID:     r.OwnerID,
		IsPrivate:   r.IsPrivate,
		InviteCode:  r.InviteCode,
		MaxUsers:    r.MaxUsers,
		ObjectCount: r.ObjectCount,
		UserCount:   userCount,
		LastActive:  r.LastActive.Format(time.RFC3339),
		CreatedAt:   r.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   r.UpdatedAt.Format(time.RFC3339),
		Users:       users,
	}
}

// BeforeCreate hook to generate UUID and invite code
func (r *Room) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	if r.InviteCode == "" && r.IsPrivate {
		r.InviteCode = generateInviteCode()
	}
	if r.LastActive.IsZero() {
		r.LastActive = time.Now()
	}
	return nil
}

func generateInviteCode() string {
	return uuid.New().String()[:8]
}
