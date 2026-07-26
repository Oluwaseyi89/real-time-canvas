package dto

import "time"

// UserResponse is the user data sent to clients
type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	IsGuest  bool   `json:"isGuest"`
	LastSeen string `json:"lastSeen,omitempty"`
}

// CreateUserRequest represents user creation request
type CreateUserRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"omitempty,email"`
	Password string `json:"password" binding:"omitempty,min=6"`
	IsGuest  bool   `json:"isGuest"`
}

// LoginRequest represents login request
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password"`
}

// GuestLoginRequest represents guest login request
type GuestLoginRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
}

// ToUserResponse converts User to UserResponse
func ToUserResponse(id, username string, isGuest bool, lastSeen time.Time) UserResponse {
	return UserResponse{
		ID:       id,
		Username: username,
		IsGuest:  isGuest,
		LastSeen: lastSeen.Format(time.RFC3339),
	}
}
