package services

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"maps"

	"real-time-canvas/real-time-canvas-service/internal/models"
	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
)

// CanvasService handles canvas object business logic
type CanvasService struct {
	canvasRepo *postgres.CanvasRepository
	roomRepo   *postgres.RoomRepository
	userRepo   *postgres.UserRepository
	syncRepo   *postgres.SyncRepository
}

// NewCanvasService creates a new canvas service
func NewCanvasService(
	canvasRepo *postgres.CanvasRepository,
	roomRepo *postgres.RoomRepository,
	userRepo *postgres.UserRepository,
	syncRepo *postgres.SyncRepository,
) *CanvasService {
	return &CanvasService{
		canvasRepo: canvasRepo,
		roomRepo:   roomRepo,
		userRepo:   userRepo,
		syncRepo:   syncRepo,
	}
}

// recordEvent appends a server-authoritative entry to the room's sync_events
// log for every canvas mutation, regardless of whether it came in through
// REST or the WebSocket persist* path (both route through this service). This
// is what makes GET /rooms/:id/events a durable, ordered history a
// reconnecting client or a time-travel replay can trust, instead of each
// client's own local-only IndexedDB event log. Recording failures are logged,
// not returned — the canvas mutation itself already committed and shouldn't
// be undone over a missed history entry.
func (s *CanvasService) recordEvent(ctx context.Context, roomID, userID, eventType string, payload map[string]interface{}) {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[CanvasService] failed to marshal event payload for %s: %v", eventType, err)
		return
	}

	event := &models.SyncEvent{
		RoomID:    roomID,
		UserID:    userID,
		EventType: eventType,
		Payload:   payloadJSON,
	}
	if err := s.syncRepo.CreateWithNextVersion(ctx, event); err != nil {
		log.Printf("[CanvasService] failed to record %s event for room %s: %v", eventType, roomID, err)
	}
}

// CreateObject creates a new canvas object
func (s *CanvasService) CreateObject(userID, roomID string, req *dto.CreateObjectRequest) (*models.CanvasObject, error) {
	ctx := context.Background()

	// Check if user exists
	exists, err := s.userRepo.Exists(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	// Get max z-index
	maxZIndex, err := s.canvasRepo.GetZIndexMax(ctx, roomID)
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
	if req.ID != "" {
		obj.ID = req.ID
	}

	err = s.canvasRepo.Create(ctx, obj)
	if err != nil {
		return nil, err
	}

	// Increment object count
	_ = s.roomRepo.IncrementObjectCount(ctx, roomID, 1)

	s.recordEvent(ctx, roomID, userID, "object:create", map[string]interface{}{
		"objectId": obj.ID,
		"type":     obj.ObjectType,
		"data":     req.Data,
		"position": map[string]float64{"x": obj.PositionX, "y": obj.PositionY},
	})

	return s.canvasRepo.FindByID(ctx, obj.ID)
}

// GetObjectByID gets a canvas object by ID
func (s *CanvasService) GetObjectByID(id string) (*models.CanvasObject, error) {
	ctx := context.Background()
	return s.canvasRepo.FindByID(ctx, id)
}

// GetRoomObjects gets all objects in a room
func (s *CanvasService) GetRoomObjects(roomID string) ([]models.CanvasObject, error) {
	ctx := context.Background()
	return s.canvasRepo.FindByRoomID(ctx, roomID)
}

// GetRoomObjectsByType gets objects in a room by type
func (s *CanvasService) GetRoomObjectsByType(roomID, objectType string) ([]models.CanvasObject, error) {
	ctx := context.Background()
	return s.canvasRepo.FindByRoomIDAndType(ctx, roomID, objectType)
}

// UpdateObject updates a canvas object
func (s *CanvasService) UpdateObject(objectID, userID string, req *dto.UpdateObjectRequest) (*models.CanvasObject, error) {
	ctx := context.Background()

	obj, err := s.canvasRepo.FindByID(ctx, objectID)
	if err != nil {
		return nil, err
	}
	if obj == nil {
		return nil, errors.New("object not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, obj.RoomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	// Update fields
	if req.Data != nil {
		// Merge onto the existing stored data rather than replacing it
		// outright. Update payloads come from the client's own toObject()
		// dump, which the frontend's safeToObject() wrapper deliberately
		// downgrades to an empty {} if Fabric's serializer throws (a known
		// Fabric v6 edge case for Group/ActiveSelection instances after
		// certain group/ungroup + transform sequences) rather than letting
		// that break the app. A full replace here turned that safety net
		// into data loss: an empty update wiped out a group's already-
		// persisted children, so the group silently vanished on the next
		// reload. Merging means a sparse or empty update payload can only
		// add/overwrite fields, never blank out ones it didn't include.
		existing := map[string]interface{}{}
		if len(obj.Data) > 0 {
			if err := json.Unmarshal(obj.Data, &existing); err != nil {
				return nil, err
			}
		}
		maps.Copy(existing, req.Data)
		dataJSON, err := json.Marshal(existing)
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

	err = s.canvasRepo.Update(ctx, obj)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.Data != nil {
		for k, v := range req.Data {
			updates[k] = v
		}
	}
	if req.PositionX != nil {
		updates["left"] = *req.PositionX
	}
	if req.PositionY != nil {
		updates["top"] = *req.PositionY
	}
	if req.Width != nil {
		updates["width"] = *req.Width
	}
	if req.Height != nil {
		updates["height"] = *req.Height
	}
	if req.Rotation != nil {
		updates["angle"] = *req.Rotation
	}
	if req.ZIndex != nil {
		updates["zIndex"] = *req.ZIndex
	}
	s.recordEvent(ctx, obj.RoomID, userID, "object:update", map[string]interface{}{
		"objectId": objectID,
		"updates":  updates,
	})

	return s.canvasRepo.FindByID(ctx, objectID)
}

// DeleteObject deletes a canvas object
func (s *CanvasService) DeleteObject(objectID, userID string) error {
	ctx := context.Background()

	obj, err := s.canvasRepo.FindByID(ctx, objectID)
	if err != nil {
		return err
	}
	if obj == nil {
		return errors.New("object not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, obj.RoomID, userID)
	if err != nil {
		return err
	}
	if !inRoom {
		return errors.New("user is not in room")
	}

	err = s.canvasRepo.Delete(ctx, objectID)
	if err != nil {
		return err
	}

	// Decrement object count
	_ = s.roomRepo.IncrementObjectCount(ctx, obj.RoomID, -1)

	s.recordEvent(ctx, obj.RoomID, userID, "object:delete", map[string]interface{}{
		"objectId": objectID,
	})

	return nil
}

// BatchCreateObjects creates multiple canvas objects
func (s *CanvasService) BatchCreateObjects(userID, roomID string, req *dto.BatchCreateObjectsRequest) ([]models.CanvasObject, error) {
	ctx := context.Background()

	// Check if user exists
	exists, err := s.userRepo.Exists(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("user not found")
	}

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return nil, err
	}
	if !inRoom {
		return nil, errors.New("user is not in room")
	}

	// Get max z-index
	maxZIndex, err := s.canvasRepo.GetZIndexMax(ctx, roomID)
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

	err = s.canvasRepo.BatchCreate(ctx, objects)
	if err != nil {
		return nil, err
	}

	// Increment object count
	_ = s.roomRepo.IncrementObjectCount(ctx, roomID, len(objects))

	// One object:create event per object (matching the granularity of the
	// single-object create path) so replay/time-travel can step through a
	// batch paste the same way it steps through individually created objects.
	for i, obj := range objects {
		s.recordEvent(ctx, roomID, userID, "object:create", map[string]interface{}{
			"objectId": obj.ID,
			"type":     obj.ObjectType,
			"data":     req.Objects[i].Data,
			"position": map[string]float64{"x": obj.PositionX, "y": obj.PositionY},
		})
	}

	return s.canvasRepo.FindByRoomID(ctx, roomID)
}

// ClearRoomObjects deletes all objects in a room
func (s *CanvasService) ClearRoomObjects(roomID, userID string) error {
	ctx := context.Background()

	// Check if user is in room
	inRoom, err := s.roomRepo.IsUserInRoom(ctx, roomID, userID)
	if err != nil {
		return err
	}
	if !inRoom {
		return errors.New("user is not in room")
	}

	if err := s.canvasRepo.DeleteByRoomID(ctx, roomID); err != nil {
		return err
	}

	s.recordEvent(ctx, roomID, userID, "canvas:clear", map[string]interface{}{})

	return nil
}

// GetObjectCount gets the count of objects in a room
func (s *CanvasService) GetObjectCount(roomID string) (int64, error) {
	ctx := context.Background()
	return s.canvasRepo.GetCountByRoomID(ctx, roomID)
}
