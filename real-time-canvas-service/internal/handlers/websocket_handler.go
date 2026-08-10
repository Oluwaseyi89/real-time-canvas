package handlers

import (
	"log"
	"net/http"

	"real-time-canvas/real-time-canvas-service/internal/services"
	ws "real-time-canvas/real-time-canvas-service/internal/websocket"
	jwtpkg "real-time-canvas/real-time-canvas-service/pkg/jwt"

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
	jwtService  *jwtpkg.Service
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(hub *ws.Hub, roomService *services.RoomService, jwtService *jwtpkg.Service) *WebSocketHandler {
	return &WebSocketHandler{hub: hub, roomService: roomService, jwtService: jwtService}
}

// HandleWebSocket handles WebSocket connections
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Browsers' native WebSocket API can't set an Authorization header on
	// the upgrade request, so the token travels as a query param instead —
	// this is the only identity source now. Previously userId/username came
	// straight from client-supplied query params with no proof of identity
	// (or a "guest-<random>" fallback if absent), so any client could claim
	// to be any user.
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token is required"})
		return
	}

	claims, err := h.jwtService.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	userID := claims.UserID
	username := claims.Username

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
