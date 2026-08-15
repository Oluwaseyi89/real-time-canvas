package main

import (
	"context"
	"log"
	"os"
	"time"

	"real-time-canvas/real-time-canvas-service/api"
	"real-time-canvas/real-time-canvas-service/internal/config"
	"real-time-canvas/real-time-canvas-service/internal/handlers"
	"real-time-canvas/real-time-canvas-service/internal/repository/postgres"
	"real-time-canvas/real-time-canvas-service/internal/services"
	"real-time-canvas/real-time-canvas-service/internal/websocket"
	jwtpkg "real-time-canvas/real-time-canvas-service/pkg/jwt"
	redisPkg "real-time-canvas/real-time-canvas-service/pkg/redis"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

// defaultJWTSecret is config.Load's fallback when JWT_SECRET isn't set. Real
// deployments must override it — signing tokens with a published default
// would make every token forgeable.
const defaultJWTSecret = "your-secret-key"

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

	if cfg.Environment == "production" && cfg.JWTSecret == defaultJWTSecret {
		log.Fatal("JWT_SECRET must be set to a real secret in production")
	}
	jwtService := jwtpkg.NewService(cfg.JWTSecret, 24*time.Hour)

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

	// Initialize media storage — S3 if configured, local disk otherwise
	mediaStorage, storageLabel, err := cfg.NewStorage(context.Background())
	if err != nil {
		log.Fatalf("Failed to initialize media storage: %v", err)
	}
	log.Printf("Media storage backend: %s", storageLabel)

	// Initialize repositories
	userRepo := postgres.NewUserRepository(cfg.DB)
	roomRepo := postgres.NewRoomRepository(cfg.DB)
	canvasRepo := postgres.NewCanvasRepository(cfg.DB)
	syncRepo := postgres.NewSyncRepository(cfg.DB)

	// Initialize services
	userService := services.NewUserService(userRepo)
	roomService := services.NewRoomService(roomRepo, userRepo, canvasRepo)
	canvasService := services.NewCanvasService(canvasRepo, roomRepo, userRepo, syncRepo)
	syncService := services.NewSyncService(syncRepo, roomRepo)
	mediaService := services.NewMediaService(mediaStorage, roomRepo, cfg.MediaMaxUploadMB)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService, jwtService)
	roomHandler := handlers.NewRoomHandler(roomService)
	canvasHandler := handlers.NewCanvasHandler(canvasService)
	syncHandler := handlers.NewSyncHandler(syncService)
	mediaHandler := handlers.NewMediaHandler(mediaService)

	// Initialize WebSocket hub
	hub := websocket.NewHub(canvasService)
	wsHandler := handlers.NewWebSocketHandler(hub, roomService, jwtService)

	// Start WebSocket hub in a goroutine
	go hub.Run()
	log.Println("WebSocket hub started")

	// Setup router
	router := api.SetupRouter(authHandler, roomHandler, canvasHandler, syncHandler, mediaHandler, wsHandler, jwtService, cfg.LocalUploadDir)

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
