package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Room represents a collaborative canvas room
type Room struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	OwnerID     string         `gorm:"type:uuid;not null;index" json:"ownerId"`
	IsPrivate   bool           `gorm:"default:false" json:"isPrivate"`
	InviteCode  string         `gorm:"type:varchar(20);uniqueIndex" json:"inviteCode,omitempty"`
	MaxUsers    int            `gorm:"default:50" json:"maxUsers"`
	ObjectCount int            `gorm:"default:0" json:"objectCount"`
	LastActive  time.Time      `gorm:"not null;default:now()" json:"lastActive"`
	CreatedAt   time.Time      `gorm:"not null;default:now()" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"not null;default:now()" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Owner   User           `gorm:"foreignKey:OwnerID" json:"-"`
	Users   []RoomUser     `gorm:"foreignKey:RoomID" json:"users,omitempty"`
	Objects []CanvasObject `gorm:"foreignKey:RoomID" json:"objects,omitempty"`
}

// TableName specifies the table name
func (Room) TableName() string {
	return "rooms"
}

// BeforeCreate hook to set timestamps and generate invite code
func (r *Room) BeforeCreate(tx *gorm.DB) error {
	now := time.Now().UTC()
	if r.CreatedAt.IsZero() {
		r.CreatedAt = now
	}
	if r.UpdatedAt.IsZero() {
		r.UpdatedAt = now
	}
	if r.LastActive.IsZero() {
		r.LastActive = now
	}
	if r.InviteCode == "" && r.IsPrivate {
		r.InviteCode = generateInviteCode()
	}
	return nil
}

// BeforeUpdate hook to update timestamp
func (r *Room) BeforeUpdate(tx *gorm.DB) error {
	r.UpdatedAt = time.Now().UTC()
	return nil
}

func generateInviteCode() string {
	return uuid.New().String()[:8]
}
