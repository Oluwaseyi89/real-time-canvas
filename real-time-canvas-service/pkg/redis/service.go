package redis

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// Service provides Redis operations for session management and pub/sub
type Service struct {
	client *redis.Client
	ctx    context.Context
}

// NewService creates a new Redis service
func NewService(client *redis.Client) *Service {
	return &Service{
		client: client,
		ctx:    context.Background(),
	}
}

// Session management

// SetSession stores a session in Redis
func (s *Service) SetSession(sessionID string, data map[string]interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return s.client.Set(s.ctx, "session:"+sessionID, jsonData, ttl).Err()
}

// GetSession retrieves a session from Redis
func (s *Service) GetSession(sessionID string) (map[string]interface{}, error) {
	data, err := s.client.Get(s.ctx, "session:"+sessionID).Bytes()
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteSession deletes a session from Redis
func (s *Service) DeleteSession(sessionID string) error {
	return s.client.Del(s.ctx, "session:"+sessionID).Err()
}

// ExtendSession extends the TTL of a session
func (s *Service) ExtendSession(sessionID string, ttl time.Duration) error {
	return s.client.Expire(s.ctx, "session:"+sessionID, ttl).Err()
}

// Pub/Sub operations

// Publish publishes a message to a channel
func (s *Service) Publish(channel string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}
	return s.client.Publish(s.ctx, channel, data).Err()
}

// Subscribe subscribes to a channel
func (s *Service) Subscribe(channels ...string) *redis.PubSub {
	return s.client.Subscribe(s.ctx, channels...)
}

// PublishToRoom publishes a message to a room channel
func (s *Service) PublishToRoom(roomID string, event string, payload interface{}) error {
	channel := "room:" + roomID + ":" + event
	return s.Publish(channel, payload)
}

// User presence

// SetUserPresence sets a user's presence in a room
func (s *Service) SetUserPresence(roomID, userID string, data map[string]interface{}, ttl time.Duration) error {
	key := "presence:" + roomID + ":" + userID
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return s.client.Set(s.ctx, key, jsonData, ttl).Err()
}

// GetUserPresence gets a user's presence in a room
func (s *Service) GetUserPresence(roomID, userID string) (map[string]interface{}, error) {
	key := "presence:" + roomID + ":" + userID
	data, err := s.client.Get(s.ctx, key).Bytes()
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// GetRoomUsers gets all users in a room
func (s *Service) GetRoomUsers(roomID string) ([]string, error) {
	pattern := "presence:" + roomID + ":*"
	keys, err := s.client.Keys(s.ctx, pattern).Result()
	if err != nil {
		return nil, err
	}
	users := make([]string, len(keys))
	for i, key := range keys {
		// Extract user ID from key
		users[i] = key[len("presence:"+roomID+":"):]
	}
	return users, nil
}

// DeleteUserPresence deletes a user's presence
func (s *Service) DeleteUserPresence(roomID, userID string) error {
	key := "presence:" + roomID + ":" + userID
	return s.client.Del(s.ctx, key).Err()
}

// Room state

// SetRoomState stores room state in Redis
func (s *Service) SetRoomState(roomID string, state map[string]interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(state)
	if err != nil {
		return err
	}
	return s.client.Set(s.ctx, "room:"+roomID, jsonData, ttl).Err()
}

// GetRoomState retrieves room state from Redis
func (s *Service) GetRoomState(roomID string) (map[string]interface{}, error) {
	data, err := s.client.Get(s.ctx, "room:"+roomID).Bytes()
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteRoomState deletes room state from Redis
func (s *Service) DeleteRoomState(roomID string) error {
	return s.client.Del(s.ctx, "room:"+roomID).Err()
}

// Rate limiting

// IncrementRateLimit increments a rate limit counter
func (s *Service) IncrementRateLimit(key string, limit int, window time.Duration) (int, error) {
	count, err := s.client.Incr(s.ctx, "ratelimit:"+key).Result()
	if err != nil {
		return 0, err
	}
	if count == 1 {
		s.client.Expire(s.ctx, "ratelimit:"+key, window)
	}
	return int(count), nil
}

// ResetRateLimit resets a rate limit counter
func (s *Service) ResetRateLimit(key string) error {
	return s.client.Del(s.ctx, "ratelimit:"+key).Err()
}

// Distributed locks

// AcquireLock acquires a distributed lock
func (s *Service) AcquireLock(key string, ttl time.Duration) (bool, error) {
	return s.client.SetNX(s.ctx, "lock:"+key, "locked", ttl).Result()
}

// ReleaseLock releases a distributed lock
func (s *Service) ReleaseLock(key string) error {
	return s.client.Del(s.ctx, "lock:"+key).Err()
}

// Health check

// Ping checks Redis connectivity
func (s *Service) Ping() error {
	return s.client.Ping(s.ctx).Err()
}

// Close closes the Redis connection
func (s *Service) Close() error {
	return s.client.Close()
}
