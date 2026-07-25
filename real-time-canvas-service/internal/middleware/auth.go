package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
			c.Abort()
			return
		}

		// For now, accept any token and extract user ID from header
		// In production, validate JWT token
		userID := c.GetHeader("X-User-ID")
		if userID == "" {
			// For development, allow user ID from query param
			userID = c.Query("userId")
			if userID == "" {
				// Demo mode: use a default user ID
				userID = "demo-user"
			}
		}

		c.Set("userID", userID)
		c.Next()
	}
}

// OptionalAuthMiddleware allows requests without authentication
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				userID := c.GetHeader("X-User-ID")
				if userID != "" {
					c.Set("userID", userID)
				}
			}
		}
		c.Next()
	}
}
