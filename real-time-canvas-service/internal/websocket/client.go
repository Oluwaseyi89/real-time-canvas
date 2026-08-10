package websocket

import (
	"log"
	"sync"
	"time"

	"real-time-canvas/real-time-canvas-service/internal/models/dto"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Client represents a WebSocket client connection
type Client struct {
	ID       string
	UserID   string
	Username string
	RoomID   string
	Conn     *websocket.Conn
	Hub      *Hub
	Send     chan *WebSocketMessage
	IsActive bool
	LastSeen time.Time
	mu       sync.RWMutex
	writeMu  sync.Mutex
}

// NewClient creates a new WebSocket client
func NewClient(conn *websocket.Conn, hub *Hub, userID, username string) *Client {
	return &Client{
		ID:       uuid.New().String(),
		UserID:   userID,
		Username: username,
		RoomID:   "",
		Conn:     conn,
		Hub:      hub,
		Send:     make(chan *WebSocketMessage, 256),
		IsActive: true,
		LastSeen: time.Now(),
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512 * 1024) // 512KB max message size
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.updateLastSeen()
		return nil
	})

	for {
		var msg WebSocketMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WebSocket] Client %s error: %v", c.ID, err)
			}
			break
		}

		// Update last seen
		c.updateLastSeen()

		// Handle message
		c.handleMessage(&msg)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			c.writeMu.Lock()
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				c.writeMu.Unlock()
				return
			}

			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			err := c.Conn.WriteJSON(msg)
			if err != nil {
				log.Printf("[WebSocket] Failed to send message to client %s: %v", c.ID, err)
				c.writeMu.Unlock()
				return
			}
			c.writeMu.Unlock()

		case <-ticker.C:
			c.writeMu.Lock()
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				c.writeMu.Unlock()
				return
			}
			c.writeMu.Unlock()
		}
	}
}

// handleMessage processes incoming messages
func (c *Client) handleMessage(msg *WebSocketMessage) {
	msg.UserID = c.UserID

	switch msg.Type {
	case MsgJoinRoom:
		var payload JoinRoomPayload
		if err := msg.ParsePayload(&payload); err != nil {
			c.sendError("invalid_payload", "Failed to parse join room payload")
			return
		}
		c.handleJoinRoom(payload.RoomID, payload.InviteCode)

	case MsgLeaveRoom:
		var payload LeaveRoomPayload
		if err := msg.ParsePayload(&payload); err != nil {
			c.sendError("invalid_payload", "Failed to parse leave room payload")
			return
		}
		c.handleLeaveRoom(payload.RoomID)

	case MsgUserPresence:
		var presence UserPresence
		if err := msg.ParsePayload(&presence); err != nil {
			c.sendError("invalid_payload", "Failed to parse presence payload")
			return
		}
		c.handlePresence(presence)

	case MsgUserCursor:
		var cursor Cursor
		if err := msg.ParsePayload(&cursor); err != nil {
			c.sendError("invalid_payload", "Failed to parse cursor payload")
			return
		}
		c.handleCursor(cursor)

	case MsgUserTyping:
		var typing struct {
			IsTyping bool `json:"isTyping"`
		}
		if err := msg.ParsePayload(&typing); err != nil {
			c.sendError("invalid_payload", "Failed to parse typing payload")
			return
		}
		c.handleTyping(typing.IsTyping)

	case MsgObjectCreate:
		var payload ObjectCreatePayload
		if err := msg.ParsePayload(&payload); err != nil {
			c.sendError("invalid_payload", "Failed to parse object create payload")
			return
		}
		c.persistObjectCreate(payload)
		c.broadcastToRoom(msg)

	case MsgObjectUpdate:
		var payload ObjectUpdatePayload
		if err := msg.ParsePayload(&payload); err != nil {
			c.sendError("invalid_payload", "Failed to parse object update payload")
			return
		}
		c.persistObjectUpdate(payload)
		c.broadcastToRoom(msg)

	case MsgObjectDelete:
		var payload ObjectDeletePayload
		if err := msg.ParsePayload(&payload); err != nil {
			c.sendError("invalid_payload", "Failed to parse object delete payload")
			return
		}
		c.persistObjectDelete(payload)
		c.broadcastToRoom(msg)

	case MsgPhysicsThrow, MsgPhysicsCollision, MsgPhysicsAttract, MsgPhysicsRepel:
		c.broadcastToRoom(msg)

	default:
		log.Printf("[WebSocket] Unknown message type: %s", msg.Type)
	}
}

// handleJoinRoom handles a user joining a room
func (c *Client) handleJoinRoom(roomID, inviteCode string) {
	// Check if already in a room
	if c.RoomID != "" {
		c.handleLeaveRoom(c.RoomID)
	}

	// Join the room
	c.RoomID = roomID
	c.Hub.JoinRoom(roomID, c)

	// Notify client
	users := c.Hub.GetUsersInRoom(roomID)
	presence := make([]UserPresence, 0, len(users))
	for _, user := range users {
		presence = append(presence, UserPresence{
			UserID:   user.UserID,
			Username: user.Username,
			IsActive: user.IsActive,
			LastSeen: user.LastSeen.UnixMilli(),
		})
	}

	payload := RoomJoinedPayload{
		RoomID: roomID,
		Users:  presence,
	}

	msg, _ := NewMessage(MsgRoomJoined, roomID, c.UserID, payload)
	c.sendMessage(msg)

	// Notify other users
	joinMsg, _ := NewMessage(MsgUserJoined, roomID, c.UserID, map[string]interface{}{
		"userId":   c.UserID,
		"username": c.Username,
	})
	c.Hub.BroadcastToRoom(roomID, joinMsg)
}

// handleLeaveRoom handles a user leaving a room
func (c *Client) handleLeaveRoom(roomID string) {
	if c.RoomID != roomID {
		return
	}

	c.RoomID = ""
	c.Hub.LeaveRoom(roomID, c)

	msg, _ := NewMessage(MsgRoomLeft, roomID, c.UserID, nil)
	c.sendMessage(msg)

	leaveMsg, _ := NewMessage(MsgUserLeft, roomID, c.UserID, map[string]interface{}{
		"userId": c.UserID,
	})
	c.Hub.BroadcastToRoom(roomID, leaveMsg)
}

// handlePresence handles presence updates
func (c *Client) handlePresence(presence UserPresence) {
	if c.RoomID == "" {
		return
	}

	presence.UserID = c.UserID
	presence.Username = c.Username
	presence.LastSeen = time.Now().UnixMilli()

	msg, _ := NewMessage(MsgUserPresence, c.RoomID, c.UserID, presence)
	c.Hub.BroadcastToRoom(c.RoomID, msg)
}

// handleCursor handles cursor position updates
func (c *Client) handleCursor(cursor Cursor) {
	if c.RoomID == "" {
		return
	}

	// Create a UserCursor with the user ID
	userCursor := UserCursor{
		UserID:    c.UserID,
		X:         cursor.X,
		Y:         cursor.Y,
		ObjectID:  cursor.ObjectID,
		Timestamp: time.Now().UnixMilli(),
	}

	msg, _ := NewMessage(MsgUserCursor, c.RoomID, c.UserID, userCursor)
	c.Hub.BroadcastToRoom(c.RoomID, msg)
}

// handleTyping handles typing status updates
func (c *Client) handleTyping(isTyping bool) {
	if c.RoomID == "" {
		return
	}

	payload := map[string]interface{}{
		"userId":    c.UserID,
		"isTyping":  isTyping,
		"timestamp": time.Now().UnixMilli(),
	}

	msg, _ := NewMessage(MsgUserTyping, c.RoomID, c.UserID, payload)
	c.Hub.BroadcastToRoom(c.RoomID, msg)
}

// broadcastToRoom broadcasts a message to all clients in the room
func (c *Client) broadcastToRoom(msg *WebSocketMessage) {
	if c.RoomID == "" {
		c.sendError("not_in_room", "Client is not in a room")
		return
	}
	c.Hub.BroadcastToRoom(c.RoomID, msg)
}

// persistObjectCreate saves a newly created object so it survives past the
// live broadcast (a REST GET /rooms/:id/objects after reload previously saw
// nothing WS-only clients had created). Persistence failures are logged, not
// fatal — a DB hiccup shouldn't stop the live view from staying in sync.
func (c *Client) persistObjectCreate(payload ObjectCreatePayload) {
	if c.Hub.CanvasService == nil || c.RoomID == "" {
		return
	}

	req := &dto.CreateObjectRequest{
		ID:        payload.ObjectID,
		RoomID:    c.RoomID,
		Type:      payload.Type,
		Data:      payload.Data,
		PositionX: payload.Position.X,
		PositionY: payload.Position.Y,
	}

	if _, err := c.Hub.CanvasService.CreateObject(c.UserID, c.RoomID, req); err != nil {
		log.Printf("[WebSocket] Failed to persist object create %s: %v", payload.ObjectID, err)
	}
}

// persistObjectUpdate saves object changes (move/resize/style edits). The
// payload carries a full Fabric object dump, same as create's Data field;
// left/top/width/height/angle are additionally lifted into their own
// columns to match how the REST update path stores them.
func (c *Client) persistObjectUpdate(payload ObjectUpdatePayload) {
	if c.Hub.CanvasService == nil {
		return
	}

	req := &dto.UpdateObjectRequest{Data: payload.Updates}
	if left, ok := payload.Updates["left"].(float64); ok {
		req.PositionX = &left
	}
	if top, ok := payload.Updates["top"].(float64); ok {
		req.PositionY = &top
	}
	if width, ok := payload.Updates["width"].(float64); ok {
		req.Width = &width
	}
	if height, ok := payload.Updates["height"].(float64); ok {
		req.Height = &height
	}
	if angle, ok := payload.Updates["angle"].(float64); ok {
		req.Rotation = &angle
	}

	if _, err := c.Hub.CanvasService.UpdateObject(payload.ObjectID, c.UserID, req); err != nil {
		log.Printf("[WebSocket] Failed to persist object update %s: %v", payload.ObjectID, err)
	}
}

// persistObjectDelete removes an object from storage to match its removal
// from the live canvas.
func (c *Client) persistObjectDelete(payload ObjectDeletePayload) {
	if c.Hub.CanvasService == nil {
		return
	}

	if err := c.Hub.CanvasService.DeleteObject(payload.ObjectID, c.UserID); err != nil {
		log.Printf("[WebSocket] Failed to persist object delete %s: %v", payload.ObjectID, err)
	}
}

// sendMessage sends a message directly to the client
func (c *Client) sendMessage(msg *WebSocketMessage) {
	select {
	case c.Send <- msg:
	default:
		c.sendError("message_queue_full", "Send buffer full")
	}
}

// sendError sends an error message to the client
func (c *Client) sendError(code, message string) {
	msg := ErrorMessage(c.RoomID, c.UserID, code, message)
	c.sendMessage(msg)
}

// updateLastSeen updates the last seen timestamp
func (c *Client) updateLastSeen() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.LastSeen = time.Now()
}

// Close closes the client connection
func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.IsActive = false
	close(c.Send)
}
