package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Connection messages
	MsgConnect   MessageType = "connection:init"
	MsgConnected MessageType = "connection:ack"
	MsgError     MessageType = "connection:error"

	// Room messages
	MsgJoinRoom   MessageType = "room:join"
	MsgLeaveRoom  MessageType = "room:leave"
	MsgRoomJoined MessageType = "room:joined"
	MsgRoomLeft   MessageType = "room:left"
	MsgRoomError  MessageType = "room:error"

	// User messages
	MsgUserPresence MessageType = "user:presence"
	MsgUserCursor   MessageType = "user:cursor"
	MsgUserTyping   MessageType = "user:typing"
	MsgUserJoined   MessageType = "user:joined"
	MsgUserLeft     MessageType = "user:left"

	// Object messages
	MsgObjectCreate MessageType = "object:create"
	MsgObjectUpdate MessageType = "object:update"
	MsgObjectDelete MessageType = "object:delete"
	MsgObjectMove   MessageType = "object:move"
	MsgObjectSelect MessageType = "object:select"

	// Canvas messages
	MsgCanvasSync  MessageType = "canvas:sync"
	MsgCanvasState MessageType = "canvas:state"
	MsgCanvasClear MessageType = "canvas:clear"

	// Physics messages
	MsgPhysicsThrow     MessageType = "physics:throw"
	MsgPhysicsCollision MessageType = "physics:collision"
	MsgPhysicsAttract   MessageType = "physics:attract"
	MsgPhysicsRepel     MessageType = "physics:repel"
	MsgPhysicsEnabled   MessageType = "physics:enabled"
	MsgPhysicsGravity   MessageType = "physics:gravity"
)

// WebSocketMessage represents a message sent over WebSocket
type WebSocketMessage struct {
	ID        string          `json:"id"`
	Type      MessageType     `json:"type"`
	RoomID    string          `json:"roomId"`
	UserID    string          `json:"userId"`
	Timestamp int64           `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

// NewMessage creates a new WebSocket message
func NewMessage(msgType MessageType, roomID, userID string, payload interface{}) (*WebSocketMessage, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return &WebSocketMessage{
		ID:        uuid.New().String(),
		Type:      msgType,
		RoomID:    roomID,
		UserID:    userID,
		Timestamp: time.Now().UnixMilli(),
		Payload:   data,
	}, nil
}

// ParsePayload parses the payload into the given type
func (m *WebSocketMessage) ParsePayload(v interface{}) error {
	return json.Unmarshal(m.Payload, v)
}

// ErrorMessage creates an error message
func ErrorMessage(roomID, userID, code, message string) *WebSocketMessage {
	payload := map[string]interface{}{
		"code":    code,
		"message": message,
	}
	data, _ := json.Marshal(payload)

	return &WebSocketMessage{
		ID:        uuid.New().String(),
		Type:      MsgError,
		RoomID:    roomID,
		UserID:    userID,
		Timestamp: time.Now().UnixMilli(),
		Payload:   data,
	}
}

// UserPresence represents a user's presence in a room
type UserPresence struct {
	UserID   string  `json:"userId"`
	Username string  `json:"username"`
	Cursor   *Cursor `json:"cursor,omitempty"`
	IsActive bool    `json:"isActive"`
	LastSeen int64   `json:"lastSeen"`
	IsTyping bool    `json:"isTyping,omitempty"`
}

// Cursor represents a user's cursor position
type Cursor struct {
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	ObjectID  string  `json:"objectId,omitempty"`
	Timestamp int64   `json:"timestamp"`
}

// UserCursor represents a cursor with user ID (used for broadcasting)
type UserCursor struct {
	UserID    string  `json:"userId"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	ObjectID  string  `json:"objectId,omitempty"`
	Timestamp int64   `json:"timestamp"`
}

// RoomJoinedPayload is sent when a user joins a room
type RoomJoinedPayload struct {
	RoomID string         `json:"roomId"`
	Users  []UserPresence `json:"users"`
}

// JoinRoomPayload is sent when a user requests to join a room
type JoinRoomPayload struct {
	RoomID     string `json:"roomId"`
	InviteCode string `json:"inviteCode,omitempty"`
}

// LeaveRoomPayload is sent when a user leaves a room
type LeaveRoomPayload struct {
	RoomID string `json:"roomId"`
}

// ObjectCreatePayload represents object creation
type ObjectCreatePayload struct {
	ObjectID string                 `json:"objectId"`
	Type     string                 `json:"type"`
	Data     map[string]interface{} `json:"data"`
	Position Position               `json:"position"`
}

// ObjectUpdatePayload represents object update
type ObjectUpdatePayload struct {
	ObjectID string                 `json:"objectId"`
	Updates  map[string]interface{} `json:"updates"`
	UserID   string                 `json:"userId"`
}

// ObjectDeletePayload represents object deletion
type ObjectDeletePayload struct {
	ObjectID string `json:"objectId"`
	UserID   string `json:"userId"`
}

// Position represents a 2D position
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// PhysicsPayload represents physics interaction
type PhysicsPayload struct {
	ObjectID string  `json:"objectId"`
	Type     string  `json:"type"`
	Velocity *Vector `json:"velocity,omitempty"`
	Force    float64 `json:"force,omitempty"`
	TargetID string  `json:"targetId,omitempty"`
}

// Vector represents a 2D vector
type Vector struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
