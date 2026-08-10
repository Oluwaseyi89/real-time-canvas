package middleware

import (
	"net/http"
	"strings"

	jwtpkg "real-time-canvas/real-time-canvas-service/pkg/jwt"

	"github.com/gin-gonic/gin"
)

// extractBearerToken pulls the token out of an "Authorization: Bearer <token>"
// header. Returns "" if the header is missing or malformed.
func extractBearerToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return parts[1]
}

// AuthMiddleware requires a valid, signed JWT. It previously accepted any
// non-empty Authorization header and trusted an unsigned X-User-ID header
// (or a "demo-user" fallback) for identity — meaning any client could act
// as any user simply by setting a header. userID/username now come only
// from a token this server itself signed.
func AuthMiddleware(jwtService *jwtpkg.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

// OptionalAuthMiddleware validates a token if one is present, but doesn't
// reject the request when it's absent. A present-but-invalid token is still
// rejected — "optional" means auth is not required, not that a bad token is
// silently ignored.
func OptionalAuthMiddleware(jwtService *jwtpkg.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractBearerToken(c)
		if token == "" {
			c.Next()
			return
		}

		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}
