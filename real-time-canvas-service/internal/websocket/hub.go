package websocket

import (
	"log"
	"sync"
	"time"

	"real-time-canvas/real-time-canvas-service/internal/services"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients
	Clients map[string]*Client

	// Rooms and their clients
	Rooms map[string]map[string]*Client

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Broadcast messages to a room
	Broadcast chan *BroadcastMessage

	// CanvasService persists object:create/update/delete alongside the
	// live broadcast, so a page reload (REST GET) sees what WS clients
	// already rendered instead of two uncoordinated views of the room.
	CanvasService *services.CanvasService

	mu sync.RWMutex
}

// BroadcastMessage represents a message to broadcast to a room
type BroadcastMessage struct {
	RoomID  string
	Message *WebSocketMessage
}

// NewHub creates a new WebSocket hub
func NewHub(canvasService *services.CanvasService) *Hub {
	return &Hub{
		Clients:       make(map[string]*Client),
		Rooms:         make(map[string]map[string]*Client),
		Register:      make(chan *Client),
		Unregister:    make(chan *Client),
		Broadcast:     make(chan *BroadcastMessage, 256),
		CanvasService: canvasService,
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.Register:
			h.handleRegister(client)

		case client := <-h.Unregister:
			h.handleUnregister(client)

		case broadcast := <-h.Broadcast:
			h.handleBroadcast(broadcast)

		case <-ticker.C:
			h.cleanupInactiveClients()
		}
	}
}

// handleRegister registers a new client
func (h *Hub) handleRegister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.Clients[client.ID] = client
	log.Printf("[WebSocket] Client %s (%s) connected", client.ID, client.Username)

	// Send welcome message
	welcome, _ := NewMessage(MsgConnected, "", client.UserID, map[string]interface{}{
		"clientId": client.ID,
		"message":  "Connected to WebSocket server",
	})
	client.sendMessage(welcome)
}

// handleUnregister unregisters a client. This is the single place a client
// is torn down from — both ReadPump's error path (via the Unregister
// channel) and the idle-client sweep below route through it, so there's one
// piece of removal logic instead of two that can drift or double-close.
// Safe to call more than once for the same client (e.g. ReadPump erroring
// out right as the idle sweep was already tearing the same client down):
// the second call finds nothing left to remove and Close() itself is a
// no-op past the first call.
func (h *Hub) handleUnregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.Clients[client.ID]; !exists {
		return
	}

	// Remove from rooms
	if client.RoomID != "" {
		h.removeClientFromRoom(client.RoomID, client)
	}

	// Remove from clients
	delete(h.Clients, client.ID)
	client.Close()

	log.Printf("[WebSocket] Client %s (%s) disconnected", client.ID, client.Username)
}

// handleBroadcast broadcasts a message to a room
func (h *Hub) handleBroadcast(broadcast *BroadcastMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	roomClients, exists := h.Rooms[broadcast.RoomID]
	if !exists {
		return
	}

	for _, client := range roomClients {
		select {
		case client.Send <- broadcast.Message:
		default:
			log.Printf("[WebSocket] Client %s send buffer full, skipping", client.ID)
		}
	}
}

// JoinRoom adds a client to a room
func (h *Hub) JoinRoom(roomID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.Rooms[roomID]; !exists {
		h.Rooms[roomID] = make(map[string]*Client)
	}

	h.Rooms[roomID][client.ID] = client
	log.Printf("[WebSocket] Client %s joined room %s", client.ID, roomID)
}

// LeaveRoom removes a client from a room
func (h *Hub) LeaveRoom(roomID string, client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.removeClientFromRoom(roomID, client)
}

// removeClientFromRoom removes a client from a room (must be called with lock held)
func (h *Hub) removeClientFromRoom(roomID string, client *Client) {
	if roomClients, exists := h.Rooms[roomID]; exists {
		delete(roomClients, client.ID)
		if len(roomClients) == 0 {
			delete(h.Rooms, roomID)
		}
	}
}

// BroadcastToRoom broadcasts a message to all clients in a room
func (h *Hub) BroadcastToRoom(roomID string, msg *WebSocketMessage) {
	select {
	case h.Broadcast <- &BroadcastMessage{RoomID: roomID, Message: msg}:
	default:
		log.Printf("[WebSocket] Broadcast buffer full for room %s", roomID)
	}
}

// GetUsersInRoom returns all users in a room
func (h *Hub) GetUsersInRoom(roomID string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	roomClients, exists := h.Rooms[roomID]
	if !exists {
		return []*Client{}
	}

	users := make([]*Client, 0, len(roomClients))
	for _, client := range roomClients {
		users = append(users, client)
	}
	return users
}

// GetClientCount returns the total number of connected clients
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.Clients)
}

// GetRoomCount returns the number of active rooms
func (h *Hub) GetRoomCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.Rooms)
}

// GetRoomClientCount returns the number of clients in a room
func (h *Hub) GetRoomClientCount(roomID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	roomClients, exists := h.Rooms[roomID]
	if !exists {
		return 0
	}
	return len(roomClients)
}

// cleanupInactiveClients finds idle clients and tears them down through
// handleUnregister — the same path ReadPump's error handler uses — instead
// of duplicating the removal logic here and calling client.Close() directly.
// That duplication was the root of the double-close panic: this ticker (on
// the hub's own goroutine) and a client's own ReadPump (on its own
// goroutine) could each independently decide to close the same client,
// and closing an already-closed channel panics. Since that panic ran on the
// hub's single goroutine, it took down real-time collaboration for every
// room, not just the idle one.
//
// Candidates are collected under a read lock and released before calling
// handleUnregister, which takes its own write lock — cleanupInactiveClients
// runs on the hub's own goroutine (the ticker case in Run's select loop),
// so holding the lock across that call would self-deadlock.
func (h *Hub) cleanupInactiveClients() {
	now := time.Now()
	timeout := 5 * time.Minute

	h.mu.RLock()
	inactive := make([]*Client, 0)
	for _, client := range h.Clients {
		client.mu.RLock()
		lastSeen := client.LastSeen
		client.mu.RUnlock()

		if now.Sub(lastSeen) > timeout {
			inactive = append(inactive, client)
		}
	}
	h.mu.RUnlock()

	for _, client := range inactive {
		log.Printf("[WebSocket] Cleaning up inactive client %s", client.ID)
		h.handleUnregister(client)
	}
}
