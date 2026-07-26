package dto

import (
	"time"
)

// RoomResponse is the room data sent to clients
type RoomResponse struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	OwnerID     string                 `json:"ownerId"`
	IsPrivate   bool                   `json:"isPrivate"`
	InviteCode  string                 `json:"inviteCode,omitempty"`
	MaxUsers    int                    `json:"maxUsers"`
	ObjectCount int                    `json:"objectCount"`
	UserCount   int                    `json:"userCount"`
	LastActive  string                 `json:"lastActive"`
	CreatedAt   string                 `json:"createdAt"`
	UpdatedAt   string                 `json:"updatedAt"`
	Users       []UserResponse         `json:"users,omitempty"`
	Settings    map[string]interface{} `json:"settings,omitempty"`
}

// CreateRoomRequest represents room creation request
type CreateRoomRequest struct {
	Name      string `json:"name" binding:"required,min=3,max=100"`
	IsPrivate bool   `json:"isPrivate"`
	MaxUsers  int    `json:"maxUsers" binding:"omitempty,min=1,max=200"`
}

// JoinRoomRequest represents room join request
type JoinRoomRequest struct {
	RoomID     string `json:"roomId" binding:"required"`
	InviteCode string `json:"inviteCode"`
}

// UpdateRoomRequest represents room update request
type UpdateRoomRequest struct {
	Name     string `json:"name" binding:"omitempty,min=3,max=100"`
	MaxUsers int    `json:"maxUsers" binding:"omitempty,min=1,max=200"`
}

// ToRoomResponse converts Room to RoomResponse
func ToRoomResponse(
	id, name, ownerID string,
	isPrivate bool,
	inviteCode *string,
	maxUsers, objectCount, userCount int,
	lastActive, createdAt, updatedAt time.Time,
	users []UserResponse,
) RoomResponse {
	inviteCodeStr := ""
	if inviteCode != nil {
		inviteCodeStr = *inviteCode
	}

	return RoomResponse{
		ID:          id,
		Name:        name,
		OwnerID:     ownerID,
		IsPrivate:   isPrivate,
		InviteCode:  inviteCodeStr,
		MaxUsers:    maxUsers,
		ObjectCount: objectCount,
		UserCount:   userCount,
		LastActive:  lastActive.Format(time.RFC3339),
		CreatedAt:   createdAt.Format(time.RFC3339),
		UpdatedAt:   updatedAt.Format(time.RFC3339),
		Users:       users,
	}
}
