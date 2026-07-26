package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Username  string         `gorm:"uniqueIndex;type:varchar(50);not null" json:"username"`
	Email     *string        `gorm:"uniqueIndex;type:varchar(255)" json:"email,omitempty"` // Pointer for nullable
	Password  string         `gorm:"type:varchar(255)" json:"-"`
	IsGuest   bool           `gorm:"default:true" json:"isGuest"`
	LastSeen  time.Time      `gorm:"not null;default:now()" json:"lastSeen"`
	CreatedAt time.Time      `gorm:"not null;default:now()" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"not null;default:now()" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Rooms   []RoomUser     `gorm:"foreignKey:UserID" json:"-"`
	Objects []CanvasObject `gorm:"foreignKey:UserID" json:"-"`
}

// TableName specifies the table name
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook to set timestamps
func (u *User) BeforeCreate(tx *gorm.DB) error {
	now := time.Now().UTC()
	if u.CreatedAt.IsZero() {
		u.CreatedAt = now
	}
	if u.UpdatedAt.IsZero() {
		u.UpdatedAt = now
	}
	if u.LastSeen.IsZero() {
		u.LastSeen = now
	}
	return nil
}

// BeforeUpdate hook to update timestamp
func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now().UTC()
	return nil
}
