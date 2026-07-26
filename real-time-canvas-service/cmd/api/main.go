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
	redisPkg "real-time-canvas/real-time-canvas-service/pkg/redis"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
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

	// Initialize database connections
	if err := cfg.InitDatabase(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Run migrations
	if err := config.RunMigrations(cfg.DB); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Database migrations completed")

	// Initialize Redis service
	var redisService *redisPkg.Service
	if cfg.Redis != nil {
		if redisClient, ok := cfg.Redis.(*redis.Client); ok {
			redisService = redisPkg.NewService(redisClient)
			log.Println("Redis service initialized")
		}
	}
	_ = redisService // Will be used for session management

	// Initialize repositories
	userRepo := postgres.NewUserRepository(cfg.DB)
	roomRepo := postgres.NewRoomRepository(cfg.DB)
	canvasRepo := postgres.NewCanvasRepository(cfg.DB)

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
