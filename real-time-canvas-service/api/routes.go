package api

import (
	"real-time-canvas/real-time-canvas-service/internal/handlers"
	"real-time-canvas/real-time-canvas-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

// SetupRouter sets up the API routes
func SetupRouter(
	authHandler *handlers.AuthHandler,
	roomHandler *handlers.RoomHandler,
	canvasHandler *handlers.CanvasHandler,
	wsHandler *handlers.WebSocketHandler,
) *gin.Engine {
	router := gin.Default()

	// CORS middleware
	router.Use(middleware.CORS())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// WebSocket endpoint (no auth required for WebSocket)
	router.GET("/ws", wsHandler.HandleWebSocket)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes (no auth required)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/guest", authHandler.GuestLogin)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
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
		}
	}

	return router
}
