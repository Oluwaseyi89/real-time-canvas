package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// SyncEvent represents a sync event for real-time updates
type SyncEvent struct {
	ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	RoomID    string         `gorm:"type:uuid;not null;index:idx_room_events" json:"roomId"`
	UserID    string         `gorm:"type:uuid;not null" json:"userId"`
	EventType string         `gorm:"type:varchar(50);not null;index:idx_room_events" json:"eventType"`
	Payload   datatypes.JSON `gorm:"type:jsonb" json:"payload"`
	Version   int            `gorm:"default:1" json:"version"`
	CreatedAt time.Time      `gorm:"not null;default:now()" json:"createdAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name
func (SyncEvent) TableName() string {
	return "sync_events"
}

// BeforeCreate hook to set timestamp
func (e *SyncEvent) BeforeCreate(tx *gorm.DB) error {
	now := time.Now().UTC()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
	return nil
}
