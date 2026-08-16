package api

import (
	"time"

	"real-time-canvas/real-time-canvas-service/internal/handlers"
	"real-time-canvas/real-time-canvas-service/internal/middleware"
	jwtpkg "real-time-canvas/real-time-canvas-service/pkg/jwt"
	redisPkg "real-time-canvas/real-time-canvas-service/pkg/redis"

	"github.com/gin-gonic/gin"
)

// SetupRouter sets up the API routes
func SetupRouter(
	authHandler *handlers.AuthHandler,
	roomHandler *handlers.RoomHandler,
	canvasHandler *handlers.CanvasHandler,
	syncHandler *handlers.SyncHandler,
	mediaHandler *handlers.MediaHandler,
	wsHandler *handlers.WebSocketHandler,
	jwtService *jwtpkg.Service,
	redisService *redisPkg.Service,
	localUploadDir string,
	allowedOrigins []string,
) *gin.Engine {
	router := gin.Default()

	// CORS middleware
	router.Use(middleware.CORS(allowedOrigins))

	// Serves files saved by storage.LocalStorage (the fallback backend used
	// when S3 isn't configured — see config.NewStorage). Harmless to
	// register even when S3 is active: the directory just stays empty and
	// nothing ever requests these paths.
	router.Static("/uploads", localUploadDir)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// WebSocket endpoint — auth happens inside the handler itself (a ?token=
	// query param, since the browser WebSocket API can't set an Authorization
	// header on the upgrade request), not via this middleware chain.
	router.GET("/ws", wsHandler.HandleWebSocket)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes (no auth required). Keyed by IP since there's no user
		// identity yet — this is what actually guards against credential
		// stuffing / brute-force login and registration spam.
		auth := v1.Group("/auth")
		auth.Use(middleware.RateLimit(redisService, 20, time.Minute, middleware.RateLimitByIP("auth")))
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/guest", authHandler.GuestLogin)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware(jwtService))
		// Keyed by user ID (set above by AuthMiddleware) rather than IP, so
		// one heavy user can't exhaust a shared-IP limit for everyone else
		// behind the same NAT/proxy.
		protected.Use(middleware.RateLimit(redisService, 300, time.Minute, middleware.RateLimitByUser("api")))
		{
			// User profile
			protected.GET("/auth/profile", authHandler.GetProfile)

			// Room routes - using :id consistently
			protected.POST("/rooms", roomHandler.CreateRoom)
			protected.GET("/rooms", roomHandler.GetUserRooms)
			protected.GET("/rooms/:id", roomHandler.GetRoom)
			protected.PUT("/rooms/:id", roomHandler.UpdateRoom)
			protected.DELETE("/rooms/:id", roomHandler.DeleteRoom)
			protected.POST("/rooms/:id/join", roomHandler.JoinRoom)
			protected.POST("/rooms/:id/leave", roomHandler.LeaveRoom)
			protected.GET("/rooms/:id/users", roomHandler.GetRoomUsers)

			// Canvas routes - also use :id for room ID to avoid conflicts
			protected.POST("/rooms/:id/objects", canvasHandler.CreateObject)
			protected.GET("/rooms/:id/objects", canvasHandler.GetObjects)
			protected.GET("/rooms/:id/objects/:objectId", canvasHandler.GetObject)
			protected.PUT("/rooms/:id/objects/:objectId", canvasHandler.UpdateObject)
			protected.DELETE("/rooms/:id/objects/:objectId", canvasHandler.DeleteObject)
			protected.POST("/rooms/:id/objects/batch", canvasHandler.BatchCreateObjects)
			protected.POST("/rooms/:id/objects/clear", canvasHandler.ClearRoomObjects)

			// Sync routes - offline queue replay for reconnecting clients
			protected.POST("/rooms/:id/events", syncHandler.CreateEvent)
			protected.GET("/rooms/:id/events", syncHandler.GetEvents)

			// Media upload - images/audio attached to canvas objects
			protected.POST("/rooms/:id/media", mediaHandler.UploadMedia)
		}
	}

	return router
}
