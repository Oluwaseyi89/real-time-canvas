package models

import (
	"time"

	"gorm.io/gorm"
)

// RoomUser represents a user's membership in a room
type RoomUser struct {
	RoomID     string    `gorm:"type:uuid;primaryKey" json:"roomId"`
	UserID     string    `gorm:"type:uuid;primaryKey;index:idx_user_rooms" json:"userId"`
	Role       string    `gorm:"type:varchar(20);default:'editor'" json:"role"` // owner, editor, viewer
	JoinedAt   time.Time `gorm:"not null;default:now()" json:"joinedAt"`
	LastActive time.Time `gorm:"not null;default:now()" json:"lastActive"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Room Room `gorm:"foreignKey:RoomID" json:"-"`
}

// TableName specifies the table name
func (RoomUser) TableName() string {
	return "room_users"
}

// BeforeCreate hook to set timestamps
func (ru *RoomUser) BeforeCreate(tx *gorm.DB) error {
	now := time.Now().UTC()
	if ru.JoinedAt.IsZero() {
		ru.JoinedAt = now
	}
	if ru.LastActive.IsZero() {
		ru.LastActive = now
	}
	return nil
}

// BeforeUpdate hook to update timestamp
func (ru *RoomUser) BeforeUpdate(tx *gorm.DB) error {
	ru.LastActive = time.Now().UTC()
	return nil
}
