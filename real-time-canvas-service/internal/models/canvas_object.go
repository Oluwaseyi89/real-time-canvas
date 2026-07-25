package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CanvasObject represents an object on the canvas
type CanvasObject struct {
	ID         string          `gorm:"primaryKey;type:uuid" json:"id"`
	RoomID     string          `gorm:"type:uuid;not null;index" json:"roomId"`
	UserID     string          `gorm:"type:uuid;not null" json:"userId"`
	ObjectType string          `gorm:"not null" json:"type"`
	Data       json.RawMessage `gorm:"type:jsonb" json:"data"`
	PositionX  float64         `json:"positionX"`
	PositionY  float64         `json:"positionY"`
	Width      float64         `json:"width,omitempty"`
	Height     float64         `json:"height,omitempty"`
	Rotation   float64         `json:"rotation,omitempty"`
	ZIndex     int             `json:"zIndex"`
	Version    int             `gorm:"default:1" json:"version"`
	CreatedAt  time.Time       `json:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt"`
	DeletedAt  gorm.DeletedAt  `gorm:"index" json:"-"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// CanvasObjectResponse is the object data sent to clients
type CanvasObjectResponse struct {
	ID        string                 `json:"id"`
	RoomID    string                 `json:"roomId"`
	UserID    string                 `json:"userId"`
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	PositionX float64                `json:"positionX"`
	PositionY float64                `json:"positionY"`
	Width     float64                `json:"width,omitempty"`
	Height    float64                `json:"height,omitempty"`
	Rotation  float64                `json:"rotation,omitempty"`
	ZIndex    int                    `json:"zIndex"`
	Version   int                    `json:"version"`
	CreatedAt string                 `json:"createdAt"`
	UpdatedAt string                 `json:"updatedAt"`
	Username  string                 `json:"username,omitempty"`
}

// CreateObjectRequest represents object creation request
type CreateObjectRequest struct {
	RoomID    string                 `json:"roomId" binding:"required"`
	Type      string                 `json:"type" binding:"required"`
	Data      map[string]interface{} `json:"data"`
	PositionX float64                `json:"positionX"`
	PositionY float64                `json:"positionY"`
	Width     float64                `json:"width,omitempty"`
	Height    float64                `json:"height,omitempty"`
	Rotation  float64                `json:"rotation,omitempty"`
	ZIndex    int                    `json:"zIndex"`
}

// UpdateObjectRequest represents object update request
type UpdateObjectRequest struct {
	Data      map[string]interface{} `json:"data,omitempty"`
	PositionX *float64               `json:"positionX,omitempty"`
	PositionY *float64               `json:"positionY,omitempty"`
	Width     *float64               `json:"width,omitempty"`
	Height    *float64               `json:"height,omitempty"`
	Rotation  *float64               `json:"rotation,omitempty"`
	ZIndex    *int                   `json:"zIndex,omitempty"`
}

// BatchCreateObjectsRequest represents batch object creation
type BatchCreateObjectsRequest struct {
	Objects []CreateObjectRequest `json:"objects" binding:"required,min=1,max=100"`
}

// ToResponse converts CanvasObject to CanvasObjectResponse
func (o *CanvasObject) ToResponse() CanvasObjectResponse {
	var data map[string]interface{}
	if len(o.Data) > 0 {
		_ = json.Unmarshal(o.Data, &data)
	}

	return CanvasObjectResponse{
		ID:        o.ID,
		RoomID:    o.RoomID,
		UserID:    o.UserID,
		Type:      o.ObjectType,
		Data:      data,
		PositionX: o.PositionX,
		PositionY: o.PositionY,
		Width:     o.Width,
		Height:    o.Height,
		Rotation:  o.Rotation,
		ZIndex:    o.ZIndex,
		Version:   o.Version,
		CreatedAt: o.CreatedAt.Format(time.RFC3339),
		UpdatedAt: o.UpdatedAt.Format(time.RFC3339),
		Username:  o.User.Username,
	}
}

// BeforeCreate hook to generate UUID
func (o *CanvasObject) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	if o.Version == 0 {
		o.Version = 1
	}
	return nil
}

// BeforeUpdate hook to increment version
func (o *CanvasObject) BeforeUpdate(tx *gorm.DB) error {
	o.Version += 1
	return nil
}
