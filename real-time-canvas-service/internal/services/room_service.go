package services

import (
	"context"
	"errors"
	"time"

	"real-time-canvas/real-time-canvas-service/internal/models"
	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
)

// RoomService handles room business logic
type RoomService struct {
	roomRepo   *postgres.RoomRepository
	userRepo   *postgres.UserRepository
	canvasRepo *postgres.CanvasRepository
}

// NewRoomService creates a new room service
func NewRoomService(
	roomRepo *postgres.RoomRepository,
	userRepo *postgres.UserRepository,
	canvasRepo *postgres.CanvasRepository,
) *RoomService {
	return &RoomService{
		roomRepo:   roomRepo,
		userRepo:   userRepo,
		canvasRepo: canvasRepo,
	}
}

// CreateRoom creates a new room
func (s *RoomService) CreateRoom(userID string, req *dto.CreateRoomRequest) (*models.Room, error) {
	ctx := context.Background()

	// Check if user exists
	exists, err := s.userRepo.Exists(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	room := &models.Room{
		Name:       req.Name,
		OwnerID:    userID,
		IsPrivate:  req.IsPrivate,
		MaxUsers:   req.MaxUsers,
		LastActive: time.Now().UTC(),
	}

	// Set default max users
	if room.MaxUsers == 0 {
		room.MaxUsers = 50
	}

	err = s.roomRepo.Create(ctx, room)
	if err != nil {
		return nil, err
	}

	// Add owner to room
	err = s.roomRepo.AddUser(ctx, room.ID, userID, "owner")
	if err != nil {
		return nil, err
	}

	return s.roomRepo.FindByID(ctx, room.ID)
}

// GetRoomByID gets a room by ID
func (s *RoomService) GetRoomByID(roomID string) (*models.Room, error) {
	ctx := context.Background()
	return s.roomRepo.FindByID(ctx, roomID)
}

// GetRoomByInviteCode gets a room by invite code
func (s *RoomService) GetRoomByInviteCode(code string) (*models.Room, error) {
	ctx := context.Background()
	return s.roomRepo.FindByInviteCode(ctx, code)
}

// GetUserRooms gets all rooms for a user
func (s *RoomService) GetUserRooms(userID string) ([]models.Room, error) {
	ctx := context.Background()

	exists, err := s.userRepo.Exists(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	rooms, _, err := s.roomRepo.FindByUserID(ctx, userID, 100, 0)
	return rooms, err
}

// UpdateRoom updates a room
func (s *RoomService) UpdateRoom(roomID, userID string, req *dto.UpdateRoomRequest) (*models.Room, error) {
	ctx := context.Background()

	// Check if user is room owner
	role, err := s.roomRepo.GetUserRole(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if role != "owner" {
		return nil, errors.New("only room owner can update room")
	}

	room, err := s.roomRepo.FindByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, errors.New("room not found")
	}

	if req.Name != "" {
		room.Name = req.Name
	}
	if req.MaxUsers > 0 {
		room.MaxUsers = req.MaxUsers
	}

	err = s.roomRepo.Update(ctx, room)
	if err != nil {
		return nil, err
	}

	return s.roomRepo.FindByID(ctx, roomID)
}

// DeleteRoom deletes a room
func (s *RoomService) DeleteRoom(roomID, userID string) error {
	ctx := context.Background()

	// Check if user is room owner
	role, err := s.roomRepo.GetUserRole(ctx, roomID, userID)
	if err != nil {
		return err
	}
	if role != "owner" {
		return errors.New("only room owner can delete room")
	}

	// Delete all objects in room
	err = s.canvasRepo.DeleteByRoomID(ctx, roomID)
	if err != nil {
		return err
	}

	// Delete room
	return s.roomRepo.Delete(ctx, roomID)
}

// JoinRoom adds a user to a room
func (s *RoomService) JoinRoom(roomID, userID, inviteCode string) (*models.Room, error) {
	ctx := context.Background()

	// Check if user exists
	exists, err := s.userRepo.Exists(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	// Check if already in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if inRoom {
		return s.roomRepo.FindByID(ctx, roomID)
	}

	// Get room
	room, err := s.roomRepo.FindByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, errors.New("room not found")
	}

	// Check private room
	if room.IsPrivate {
		if inviteCode == "" {
			return nil, errors.New("invite code required for private room")
		}
		if room.InviteCode != inviteCode {
			return nil, errors.New("invalid invite code")
		}
	}

	// Check max users
	if len(room.Users) >= room.MaxUsers {
		return nil, errors.New("room is full")
	}

	// Add user to room
	err = s.roomRepo.AddUser(ctx, roomID, userID, "editor")
	if err != nil {
		return nil, err
	}

	return s.roomRepo.FindByID(ctx, roomID)
}

// LeaveRoom removes a user from a room
func (s *RoomService) LeaveRoom(roomID, userID string) error {
	ctx := context.Background()

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return err
	}
	if !inRoom {
		return errors.New("user is not in room")
	}

	// Check if user is owner
	role, err := s.roomRepo.GetUserRole(ctx, roomID, userID)
	if err != nil {
		return err
	}
	if role == "owner" {
		return errors.New("room owner cannot leave, delete room instead")
	}

	return s.roomRepo.RemoveUser(ctx, roomID, userID)
}

// GetRoomUsers gets all users in a room
func (s *RoomService) GetRoomUsers(roomID string) ([]models.RoomUser, error) {
	ctx := context.Background()
	return s.roomRepo.GetRoomUsers(ctx, roomID)
}
