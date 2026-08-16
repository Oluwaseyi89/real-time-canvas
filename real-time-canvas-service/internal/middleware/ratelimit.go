package middleware

import (
	"log"
	"net/http"
	"strconv"
	"time"

	redisPkg "real-time-canvas/real-time-canvas-service/pkg/redis"

	"github.com/gin-gonic/gin"
)

// RateLimit throttles requests keyed by keyFunc(c) to `limit` within
// `window`, backed by the Redis INCR+EXPIRE counter in pkg/redis
// (IncrementRateLimit/ResetRateLimit). Redis is optional — a deployment can
// run without it (see config.InitDatabase) — so a nil redisService, or any
// error talking to Redis, fails open (lets the request through) rather than
// taking the whole API down over a rate-limiter outage.
func RateLimit(redisService *redisPkg.Service, limit int, window time.Duration, keyFunc func(*gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if redisService == nil {
			c.Next()
			return
		}

		key := keyFunc(c)
		count, err := redisService.IncrementRateLimit(key, limit, window)
		if err != nil {
			log.Printf("[RateLimit] redis error for key %s, failing open: %v", key, err)
			c.Next()
			return
		}

		if count > limit {
			c.Header("Retry-After", strconv.Itoa(int(window.Seconds())))
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded, try again later"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RateLimitByIP keys the limiter on the client's IP, namespaced by prefix.
// Used for unauthenticated endpoints (login/register/guest) where there's
// no user identity yet to key on and brute-forcing is the actual risk.
func RateLimitByIP(prefix string) func(*gin.Context) string {
	return func(c *gin.Context) string {
		return prefix + ":ip:" + c.ClientIP()
	}
}

// RateLimitByUser keys the limiter on the authenticated user's ID (set by
// AuthMiddleware, which must run before this). Falls back to IP so the key
// is never empty if it somehow runs unauthenticated.
func RateLimitByUser(prefix string) func(*gin.Context) string {
	return func(c *gin.Context) string {
		if userID := c.GetString("userID"); userID != "" {
			return prefix + ":user:" + userID
		}
		return prefix + ":ip:" + c.ClientIP()
	}
}
