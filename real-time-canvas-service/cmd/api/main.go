package main

import (
	"log"
	"os"

	"real-time-canvas/real-time-canvas-service/api"
	"real-time-canvas/real-time-canvas-service/internal/config"
	"real-time-canvas/real-time-canvas-service/internal/handlers"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
	"real-time-canvas/real-time-canvas-service/internal/services"
	"real-time-canvas/real-time-canvas-service/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := config.InitPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate models
	if err := config.Migrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Initialize Redis
	_, err = config.InitRedis(cfg)
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v", err)
	} else {
		log.Println("Redis connected successfully")
	}

	// Initialize repositories
	userRepo := postgres.NewUserRepository(db)
	roomRepo := postgres.NewRoomRepository(db)
	canvasRepo := postgres.NewCanvasRepository(db)

	// Initialize services
	userService := services.NewUserService(userRepo)
	roomService := services.NewRoomService(roomRepo, userRepo, canvasRepo)
	canvasService := services.NewCanvasService(canvasRepo, roomRepo, userRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService)
	roomHandler := handlers.NewRoomHandler(roomService)
	canvasHandler := handlers.NewCanvasHandler(canvasService)

	// Initialize WebSocket hub
	hub := websocket.NewHub()
	wsHandler := handlers.NewWebSocketHandler(hub)

	// Start WebSocket hub in a goroutine
	go hub.Run()
	log.Println("WebSocket hub started")

	// Setup router
	router := api.SetupRouter(authHandler, roomHandler, canvasHandler, wsHandler)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
