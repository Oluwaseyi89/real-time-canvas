package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SyncEvent represents a sync event for real-time updates
type SyncEvent struct {
	ID        string          `gorm:"primaryKey;type:uuid" json:"id"`
	RoomID    string          `gorm:"type:uuid;not null;index" json:"roomId"`
	UserID    string          `gorm:"type:uuid;not null" json:"userId"`
	EventType string          `gorm:"not null;index" json:"eventType"`
	Payload   json.RawMessage `gorm:"type:jsonb" json:"payload"`
	Version   int             `gorm:"default:1" json:"version"`
	CreatedAt time.Time       `json:"createdAt"`
	DeletedAt gorm.DeletedAt  `gorm:"index" json:"-"`
}

// SyncEventResponse is the sync event sent to clients
type SyncEventResponse struct {
	ID        string                 `json:"id"`
	RoomID    string                 `json:"roomId"`
	UserID    string                 `json:"userId"`
	EventType string                 `json:"eventType"`
	Payload   map[string]interface{} `json:"payload"`
	Version   int                    `json:"version"`
	CreatedAt string                 `json:"createdAt"`
}

// CreateSyncEventRequest represents sync event creation
type CreateSyncEventRequest struct {
	EventType string                 `json:"eventType" binding:"required"`
	Payload   map[string]interface{} `json:"payload"`
}

// BeforeCreate hook to generate UUID
func (e *SyncEvent) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	return nil
}

// ToResponse converts SyncEvent to SyncEventResponse
func (e *SyncEvent) ToResponse() SyncEventResponse {
	var payload map[string]interface{}
	if len(e.Payload) > 0 {
		_ = json.Unmarshal(e.Payload, &payload)
	}

	return SyncEventResponse{
		ID:        e.ID,
		RoomID:    e.RoomID,
		UserID:    e.UserID,
		EventType: e.EventType,
		Payload:   payload,
		Version:   e.Version,
		CreatedAt: e.CreatedAt.Format(time.RFC3339),
	}
}
