package dto

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
