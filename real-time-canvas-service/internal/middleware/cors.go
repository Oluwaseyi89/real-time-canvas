package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS handles Cross-Origin Resource Sharing. Browsers reject a response
// carrying both "Access-Control-Allow-Origin: *" and
// "Access-Control-Allow-Credentials: true" for any credentialed request
// (cookies, Authorization header, etc.) — so instead of a wildcard, the
// request's Origin is reflected back (and Allow-Credentials set) only when
// it's in allowedOrigins. A disallowed/absent Origin gets no CORS headers
// at all, which browsers treat as "not permitted" for cross-origin use.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		o = strings.TrimSpace(o)
		if o != "" {
			allowed[o] = struct{}{}
		}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowed[origin]; ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			// Tells caches/CDNs the response varies by Origin, since it's no
			// longer a single fixed value for every client.
			c.Header("Vary", "Origin")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, X-CSRF-Token, X-User-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
