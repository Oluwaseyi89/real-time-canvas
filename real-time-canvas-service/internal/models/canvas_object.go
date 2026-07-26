package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// CanvasObject represents an object on the canvas
type CanvasObject struct {
	ID         string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	RoomID     string         `gorm:"type:uuid;not null;index:idx_room_objects" json:"roomId"`
	UserID     string         `gorm:"type:uuid;not null" json:"userId"`
	ObjectType string         `gorm:"type:varchar(50);not null;index:idx_room_objects" json:"type"`
	Data       datatypes.JSON `gorm:"type:jsonb" json:"data"`
	PositionX  float64        `gorm:"not null;default:0" json:"positionX"`
	PositionY  float64        `gorm:"not null;default:0" json:"positionY"`
	Width      float64        `gorm:"default:0" json:"width,omitempty"`
	Height     float64        `gorm:"default:0" json:"height,omitempty"`
	Rotation   float64        `gorm:"default:0" json:"rotation,omitempty"`
	ZIndex     int            `gorm:"not null;default:0;index:idx_room_objects" json:"zIndex"`
	Version    int            `gorm:"default:1" json:"version"`
	CreatedAt  time.Time      `gorm:"not null;default:now()" json:"createdAt"`
	UpdatedAt  time.Time      `gorm:"not null;default:now()" json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName specifies the table name
func (CanvasObject) TableName() string {
	return "canvas_objects"
}

// BeforeCreate hook to set timestamps and version
func (o *CanvasObject) BeforeCreate(tx *gorm.DB) error {
	now := time.Now().UTC()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = now
	}
	if o.UpdatedAt.IsZero() {
		o.UpdatedAt = now
	}
	if o.Version == 0 {
		o.Version = 1
	}
	return nil
}

// BeforeUpdate hook to increment version and update timestamp
func (o *CanvasObject) BeforeUpdate(tx *gorm.DB) error {
	o.UpdatedAt = time.Now().UTC()
	o.Version += 1
	return nil
}
