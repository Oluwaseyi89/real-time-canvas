package websocket

import (
	"log"
	"sync"
)

// RoomManager manages room state and persistence
type RoomManager struct {
	hub *Hub
	mu  sync.RWMutex

	// Room metadata
	roomMetadata map[string]RoomMetadata
}

// RoomMetadata contains metadata about a room
type RoomMetadata struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	OwnerID     string `json:"ownerId"`
	IsPrivate   bool   `json:"isPrivate"`
	InviteCode  string `json:"inviteCode,omitempty"`
	MaxUsers    int    `json:"maxUsers"`
	ObjectCount int    `json:"objectCount"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

// NewRoomManager creates a new room manager
func NewRoomManager(hub *Hub) *RoomManager {
	return &RoomManager{
		hub:          hub,
		roomMetadata: make(map[string]RoomMetadata),
	}
}

// CreateRoom creates a new room
func (rm *RoomManager) CreateRoom(roomID, name, ownerID string, isPrivate bool, maxUsers int) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	rm.roomMetadata[roomID] = RoomMetadata{
		ID:          roomID,
		Name:        name,
		OwnerID:     ownerID,
		IsPrivate:   isPrivate,
		MaxUsers:    maxUsers,
		ObjectCount: 0,
		CreatedAt:   currentTimeMillis(),
		UpdatedAt:   currentTimeMillis(),
	}

	log.Printf("[RoomManager] Created room %s (%s)", roomID, name)
}

// GetRoomMetadata gets room metadata
func (rm *RoomManager) GetRoomMetadata(roomID string) (RoomMetadata, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	metadata, exists := rm.roomMetadata[roomID]
	return metadata, exists
}

// UpdateRoomMetadata updates room metadata
func (rm *RoomManager) UpdateRoomMetadata(roomID string, updates map[string]interface{}) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	metadata, exists := rm.roomMetadata[roomID]
	if !exists {
		return
	}

	if name, ok := updates["name"].(string); ok {
		metadata.Name = name
	}
	if maxUsers, ok := updates["maxUsers"].(int); ok {
		metadata.MaxUsers = maxUsers
	}
	if isPrivate, ok := updates["isPrivate"].(bool); ok {
		metadata.IsPrivate = isPrivate
	}
	if objectCount, ok := updates["objectCount"].(int); ok {
		metadata.ObjectCount = objectCount
	}

	metadata.UpdatedAt = currentTimeMillis()
	rm.roomMetadata[roomID] = metadata

	log.Printf("[RoomManager] Updated room %s", roomID)
}

// DeleteRoom deletes a room
func (rm *RoomManager) DeleteRoom(roomID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	delete(rm.roomMetadata, roomID)
	log.Printf("[RoomManager] Deleted room %s", roomID)
}

// GetAllRooms returns all room metadata
func (rm *RoomManager) GetAllRooms() []RoomMetadata {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	rooms := make([]RoomMetadata, 0, len(rm.roomMetadata))
	for _, metadata := range rm.roomMetadata {
		rooms = append(rooms, metadata)
	}
	return rooms
}

// GetUserRooms returns rooms for a user
func (rm *RoomManager) GetUserRooms(userID string) []RoomMetadata {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	rooms := []RoomMetadata{}
	for _, metadata := range rm.roomMetadata {
		if metadata.OwnerID == userID {
			rooms = append(rooms, metadata)
		}
	}
	return rooms
}

// IncrementObjectCount increments the object count for a room
func (rm *RoomManager) IncrementObjectCount(roomID string, delta int) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	metadata, exists := rm.roomMetadata[roomID]
	if !exists {
		return
	}

	metadata.ObjectCount += delta
	metadata.UpdatedAt = currentTimeMillis()
	rm.roomMetadata[roomID] = metadata
}

// IsRoomFull checks if a room has reached its max capacity
func (rm *RoomManager) IsRoomFull(roomID string) bool {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	metadata, exists := rm.roomMetadata[roomID]
	if !exists {
		return true
	}

	clientCount := rm.hub.GetRoomClientCount(roomID)
	return clientCount >= metadata.MaxUsers
}

// currentTimeMillis returns the current time in milliseconds
func currentTimeMillis() int64 {
	return 0 // Will be implemented with time.Now().UnixMilli()
}

// ValidateInviteCode validates an invite code for a room
func (rm *RoomManager) ValidateInviteCode(roomID, inviteCode string) bool {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	metadata, exists := rm.roomMetadata[roomID]
	if !exists {
		return false
	}

	if !metadata.IsPrivate {
		return true
	}

	return metadata.InviteCode == inviteCode
}
