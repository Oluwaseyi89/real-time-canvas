package websocket

import (
	"log"
	"sync"
	"time"
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

	mu sync.RWMutex
}

// BroadcastMessage represents a message to broadcast to a room
type BroadcastMessage struct {
	RoomID  string
	Message *WebSocketMessage
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Rooms:      make(map[string]map[string]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan *BroadcastMessage, 256),
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

// handleUnregister unregisters a client
func (h *Hub) handleUnregister(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

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

// cleanupInactiveClients removes inactive clients
func (h *Hub) cleanupInactiveClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	timeout := 5 * time.Minute

	for _, client := range h.Clients {
		client.mu.RLock()
		lastSeen := client.LastSeen
		client.mu.RUnlock()

		if now.Sub(lastSeen) > timeout {
			log.Printf("[WebSocket] Cleaning up inactive client %s", client.ID)
			if client.RoomID != "" {
				h.removeClientFromRoom(client.RoomID, client)
			}
			delete(h.Clients, client.ID)
			client.Close()
		}
	}
}
