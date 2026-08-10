package handlers

import (
	"crypto/rand"
	"log"
	"math/big"
	"net/http"

	"real-time-canvas/real-time-canvas-service/internal/services"
	ws "real-time-canvas/real-time-canvas-service/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	hub         *ws.Hub
	roomService *services.RoomService
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *ws.Hub, roomService *services.RoomService) *WebSocketHandler {
	return &WebSocketHandler{hub: hub, roomService: roomService}
}

// HandleWebSocket handles WebSocket connections
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Get user info from context (set by auth middleware)
	userID := c.GetString("userID")
	if userID == "" {
		userID = c.Query("userId")
		if userID == "" {
			userID = "guest-" + generateShortID()
		}
	}

	username := c.Query("username")
	if username == "" {
		username = "Guest"
	}

	// Get room ID from query — no "default" fallback: a room-less socket has
	// no membership to validate and nothing legitimate to join.
	roomID := c.Query("roomId")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "roomId is required"})
		return
	}

	// Reject joins for users who aren't actually room members instead of
	// trusting the client-supplied roomId outright. Clients become members
	// via POST /rooms/:id/join (invite-code checked there) before they ever
	// open this socket, so a legitimate client always passes this check.
	inRoom, err := h.roomService.IsUserInRoom(roomID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to validate room membership"})
		return
	}
	if !inRoom {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a member of this room"})
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WebSocket] Failed to upgrade connection: %v", err)
		return
	}

	// Create client
	client := ws.NewClient(conn, h.hub, userID, username)

	// Register client
	h.hub.Register <- client

	// Join room
	client.RoomID = roomID
	h.hub.JoinRoom(roomID, client)

	// Notify room users
	joinMsg, _ := ws.NewMessage(
		ws.MsgUserJoined,
		roomID,
		userID,
		map[string]interface{}{
			"userId":   userID,
			"username": username,
		},
	)
	h.hub.BroadcastToRoom(roomID, joinMsg)

	// Start client pumps
	go client.WritePump()
	go client.ReadPump()

	log.Printf("[WebSocket] Client connected: %s (%s) in room %s", client.ID, username, roomID)
}

// generateShortID generates a short ID using crypto/rand
func generateShortID() string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 6)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			// Fallback to a simple counter-based approach if crypto/rand fails
			return fallbackShortID()
		}
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

// fallbackShortID is a fallback ID generator
func fallbackShortID() string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}
