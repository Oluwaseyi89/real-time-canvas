package services

import (
	"errors"
	"time"

	"real-time-canvas/real-time-canvas-service/internal/models"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"

	"golang.org/x/crypto/bcrypt"
)

// UserService handles user business logic
type UserService struct {
	userRepo *postgres.UserRepository
}

// NewUserService creates a new user service
func NewUserService(userRepo *postgres.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

// CreateUser creates a new user
func (s *UserService) CreateUser(req *models.CreateUserRequest) (*models.User, error) {
	// Check if username exists
	existing, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("username already exists")
	}

	// Check if email exists (if provided)
	if req.Email != "" {
		existing, err := s.userRepo.FindByEmail(req.Email)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("email already exists")
		}
	}

	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		IsGuest:  req.IsGuest,
		LastSeen: time.Now(),
	}

	// Hash password if provided
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hashedPassword)
	}

	err = s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// LoginUser authenticates a user
func (s *UserService) LoginUser(req *models.LoginRequest) (*models.User, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid credentials")
	}

	// Guest users can't login with password
	if user.IsGuest {
		return nil, errors.New("guest users cannot login with password")
	}

	// Check password
	if user.Password == "" {
		return nil, errors.New("invalid credentials")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Update last seen
	_ = s.userRepo.UpdateLastSeen(user.ID)

	return user, nil
}

// GetUserByID gets a user by ID
func (s *UserService) GetUserByID(id string) (*models.User, error) {
	return s.userRepo.FindByID(id)
}

// GetUserByUsername gets a user by username
func (s *UserService) GetUserByUsername(username string) (*models.User, error) {
	return s.userRepo.FindByUsername(username)
}

// UpdateLastSeen updates the last seen timestamp
func (s *UserService) UpdateLastSeen(id string) error {
	return s.userRepo.UpdateLastSeen(id)
}

// GetActiveUsers gets active users
func (s *UserService) GetActiveUsers() ([]models.User, error) {
	return s.userRepo.GetActiveUsers()
}

// CreateGuestUser creates a guest user
func (s *UserService) CreateGuestUser(req *models.GuestLoginRequest) (*models.User, error) {
	// Check if username exists for non-guest
	existing, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if existing != nil && !existing.IsGuest {
		return nil, errors.New("username already taken")
	}

	// Find or create guest
	user, err := s.userRepo.FindOrCreateGuest(req.Username)
	if err != nil {
		return nil, err
	}

	// Update last seen
	_ = s.userRepo.UpdateLastSeen(user.ID)

	return user, nil
}
