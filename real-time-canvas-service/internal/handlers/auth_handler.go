package handlers

import (
	"log"
	"net/http"

	"real-time-canvas/real-time-canvas-service/internal/models/dto"
	"real-time-canvas/real-time-canvas-service/internal/services"
	jwtpkg "real-time-canvas/real-time-canvas-service/pkg/jwt"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	userService *services.UserService
	jwtService  *jwtpkg.Service
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userService *services.UserService, jwtService *jwtpkg.Service) *AuthHandler {
	return &AuthHandler{userService: userService, jwtService: jwtService}
}

// issueToken mints a token for the response, or logs and leaves it blank on
// failure rather than failing the whole request — the account action itself
// (register/login/guest) already succeeded by this point.
func (h *AuthHandler) issueToken(userID, username string) string {
	token, err := h.jwtService.GenerateToken(userID, username)
	if err != nil {
		log.Printf("[AuthHandler] Failed to issue token for user %s: %v", userID, err)
		return ""
	}
	return token
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.CreateUser(&req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	resp := dto.ToUserResponse(user.ID, user.Username, user.IsGuest, user.LastSeen)
	resp.Token = h.issueToken(user.ID, user.Username)
	c.JSON(http.StatusCreated, resp)
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.LoginUser(&req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	resp := dto.ToUserResponse(user.ID, user.Username, user.IsGuest, user.LastSeen)
	resp.Token = h.issueToken(user.ID, user.Username)
	c.JSON(http.StatusOK, resp)
}

// GuestLogin handles guest login
func (h *AuthHandler) GuestLogin(c *gin.Context) {
	var req dto.GuestLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.CreateGuestUser(&req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	resp := dto.ToUserResponse(user.ID, user.Username, user.IsGuest, user.LastSeen)
	resp.Token = h.issueToken(user.ID, user.Username)
	c.JSON(http.StatusOK, resp)
}

// GetProfile gets the current user profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, dto.ToUserResponse(user.ID, user.Username, user.IsGuest, user.LastSeen))
}
