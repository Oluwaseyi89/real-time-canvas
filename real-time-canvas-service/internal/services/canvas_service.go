package services

import (
	"encoding/json"
	"errors"
	"real-time-canvas/real-time-canvas-service/internal/models"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
)

// CanvasService handles canvas object business logic
type CanvasService struct {
	canvasRepo *postgres.CanvasRepository
	roomRepo   *postgres.RoomRepository
	userRepo   *postgres.UserRepository
}

// NewCanvasService creates a new canvas service
func NewCanvasService(
	canvasRepo *postgres.CanvasRepository,
	roomRepo *postgres.RoomRepository,
	userRepo *postgres.UserRepository,
) *CanvasService {
	return &CanvasService{
		canvasRepo: canvasRepo,
		roomRepo:   roomRepo,
		userRepo:   userRepo,
	}
}

// CreateObject creates a new canvas object
func (s *CanvasService) CreateObject(userID, roomID string, req *models.CreateObjectRequest) (*models.CanvasObject, error) {
	// Check if user exists
	exists, err := s.userRepo.Exists(userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	// Get max z-index
	maxZIndex, err := s.canvasRepo.GetZIndexMax(roomID)
	if err != nil {
		return nil, err
	}

	// Marshal data
	dataJSON, err := json.Marshal(req.Data)
	if err != nil {
		return nil, err
	}

	obj := &models.CanvasObject{
		RoomID:     roomID,
		UserID:     userID,
		ObjectType: req.Type,
		Data:       dataJSON,
		PositionX:  req.PositionX,
		PositionY:  req.PositionY,
		Width:      req.Width,
		Height:     req.Height,
		Rotation:   req.Rotation,
		ZIndex:     maxZIndex + 1,
	}

	err = s.canvasRepo.Create(obj)
	if err != nil {
		return nil, err
	}

	// Increment object count
	_ = s.roomRepo.IncrementObjectCount(roomID, 1)

	return s.canvasRepo.FindByID(obj.ID)
}

// GetObjectByID gets a canvas object by ID
func (s *CanvasService) GetObjectByID(id string) (*models.CanvasObject, error) {
	return s.canvasRepo.FindByID(id)
}

// GetRoomObjects gets all objects in a room
func (s *CanvasService) GetRoomObjects(roomID string) ([]models.CanvasObject, error) {
	return s.canvasRepo.FindByRoomID(roomID)
}

// GetRoomObjectsByType gets objects in a room by type
func (s *CanvasService) GetRoomObjectsByType(roomID, objectType string) ([]models.CanvasObject, error) {
	return s.canvasRepo.FindByRoomIDAndType(roomID, objectType)
}

// UpdateObject updates a canvas object
func (s *CanvasService) UpdateObject(objectID, userID string, req *models.UpdateObjectRequest) (*models.CanvasObject, error) {
	obj, err := s.canvasRepo.FindByID(objectID)
	if err != nil {
		return nil, err
	}
	if obj == nil {
		return nil, errors.New("object not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(obj.RoomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	// Update fields
	if req.Data != nil {
		dataJSON, err := json.Marshal(req.Data)
		if err != nil {
			return nil, err
		}
		obj.Data = dataJSON
	}
	if req.PositionX != nil {
		obj.PositionX = *req.PositionX
	}
	if req.PositionY != nil {
		obj.PositionY = *req.PositionY
	}
	if req.Width != nil {
		obj.Width = *req.Width
	}
	if req.Height != nil {
		obj.Height = *req.Height
	}
	if req.Rotation != nil {
		obj.Rotation = *req.Rotation
	}
	if req.ZIndex != nil {
		obj.ZIndex = *req.ZIndex
	}

	err = s.canvasRepo.Update(obj)
	if err != nil {
		return nil, err
	}

	return s.canvasRepo.FindByID(objectID)
}

// DeleteObject deletes a canvas object
func (s *CanvasService) DeleteObject(objectID, userID string) error {
	obj, err := s.canvasRepo.FindByID(objectID)
	if err != nil {
		return err
	}
	if obj == nil {
		return errors.New("object not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(obj.RoomID, userID)
	if err != nil {
		return err
	}
	if !inRoom {
		return errors.New("user is not in room")
	}

	err = s.canvasRepo.Delete(objectID)
	if err != nil {
		return err
	}

	// Decrement object count
	_ = s.roomRepo.IncrementObjectCount(obj.RoomID, -1)

	return nil
}

// BatchCreateObjects creates multiple canvas objects
func (s *CanvasService) BatchCreateObjects(userID, roomID string, req *models.BatchCreateObjectsRequest) ([]models.CanvasObject, error) {
	// Check if user exists
	exists, err := s.userRepo.Exists(userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	// Get max z-index
	maxZIndex, err := s.canvasRepo.GetZIndexMax(roomID)
	if err != nil {
		return nil, err
	}

	var objects []models.CanvasObject
	for i, reqObj := range req.Objects {
		dataJSON, err := json.Marshal(reqObj.Data)
		if err != nil {
			return nil, err
		}

		obj := models.CanvasObject{
			RoomID:     roomID,
			UserID:     userID,
			ObjectType: reqObj.Type,
			Data:       dataJSON,
			PositionX:  reqObj.PositionX,
			PositionY:  reqObj.PositionY,
			Width:      reqObj.Width,
			Height:     reqObj.Height,
			Rotation:   reqObj.Rotation,
			ZIndex:     maxZIndex + i + 1,
		}
		objects = append(objects, obj)
	}

	err = s.canvasRepo.BatchCreate(objects)
	if err != nil {
		return nil, err
	}

	// Increment object count
	_ = s.roomRepo.IncrementObjectCount(roomID, len(objects))

	return s.canvasRepo.FindByRoomID(roomID)
}

// ClearRoomObjects deletes all objects in a room
func (s *CanvasService) ClearRoomObjects(roomID, userID string) error {
	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(roomID, userID)
	if err != nil {
		return err
	}
	if !inRoom {
		return errors.New("user is not in room")
	}

	return s.canvasRepo.DeleteByRoomID(roomID)
}

// GetObjectCount gets the count of objects in a room
func (s *CanvasService) GetObjectCount(roomID string) (int64, error) {
	return s.canvasRepo.GetCountByRoomID(roomID)
}
