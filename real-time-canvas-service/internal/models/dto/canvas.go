package dto

import (
	"encoding/json"
	"time"

	"gorm.io/datatypes"
)

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
	// ID is optional. Left empty, the database generates one (REST create).
	// The WebSocket path sets it explicitly so the persisted row matches the
	// UUID the client already generated and broadcast to other clients.
	ID        string                 `json:"id,omitempty"`
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

// ToCanvasObjectResponse converts a CanvasObject to CanvasObjectResponse
func ToCanvasObjectResponse(
	id, roomID, userID, objectType string,
	data datatypes.JSON,
	positionX, positionY, width, height, rotation float64,
	zIndex, version int,
	createdAt, updatedAt time.Time,
	username string,
) CanvasObjectResponse {
	var dataMap map[string]interface{}
	if len(data) > 0 {
		_ = json.Unmarshal(data, &dataMap)
	}

	return CanvasObjectResponse{
		ID:        id,
		RoomID:    roomID,
		UserID:    userID,
		Type:      objectType,
		Data:      dataMap,
		PositionX: positionX,
		PositionY: positionY,
		Width:     width,
		Height:    height,
		Rotation:  rotation,
		ZIndex:    zIndex,
		Version:   version,
		CreatedAt: createdAt.Format(time.RFC3339),
		UpdatedAt: updatedAt.Format(time.RFC3339),
		Username:  username,
	}
}
