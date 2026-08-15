package dto

import (
	"encoding/json"
	"time"

	"gorm.io/datatypes"
)

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

// ToSyncEventResponse converts a SyncEvent to a SyncEventResponse
func ToSyncEventResponse(
	id, roomID, userID, eventType string,
	payload datatypes.JSON,
	version int,
	createdAt time.Time,
) SyncEventResponse {
	var payloadMap map[string]interface{}
	if len(payload) > 0 {
		_ = json.Unmarshal(payload, &payloadMap)
	}

	return SyncEventResponse{
		ID:        id,
		RoomID:    roomID,
		UserID:    userID,
		EventType: eventType,
		Payload:   payloadMap,
		Version:   version,
		CreatedAt: createdAt.Format(time.RFC3339),
	}
}
