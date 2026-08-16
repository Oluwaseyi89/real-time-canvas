package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"real-time-canvas/real-time-canvas-service/internal/storage"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

// Config holds application configuration
type Config struct {
	Environment string
	Port        string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret string

	// CORS — origins allowed to make credentialed cross-origin requests.
	// Browsers reject "Access-Control-Allow-Origin: *" combined with
	// "Access-Control-Allow-Credentials: true" for any credentialed request,
	// so this must be a specific, known set of origins, not a wildcard.
	AllowedOrigins []string

	// Media storage — S3 (or an S3-compatible service) when S3Bucket is
	// set, local disk otherwise. See NewStorage.
	S3Bucket           string
	S3Region           string
	S3Endpoint         string
	S3AccessKeyID      string
	S3SecretAccessKey  string
	S3UsePathStyle     bool
	S3PublicURLBase    string
	LocalUploadDir     string
	LocalUploadBaseURL string
	MediaMaxUploadMB   int

	// Services
	DB    *gorm.DB
	Redis interface{}
}

// Load loads configuration from environment
func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:        getEnv("PORT", "8080"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "collaborative_canvas"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),

		JWTSecret: getEnv("JWT_SECRET", "your-secret-key"),

		AllowedOrigins: getEnvAsSlice("ALLOWED_ORIGINS", "http://localhost:3000"),

		S3Bucket:           getEnv("S3_BUCKET", ""),
		S3Region:           getEnv("S3_REGION", "us-east-1"),
		S3Endpoint:         getEnv("S3_ENDPOINT", ""),
		S3AccessKeyID:      getEnv("S3_ACCESS_KEY_ID", ""),
		S3SecretAccessKey:  getEnv("S3_SECRET_ACCESS_KEY", ""),
		S3UsePathStyle:     getEnvAsBool("S3_USE_PATH_STYLE", false),
		S3PublicURLBase:    getEnv("S3_PUBLIC_URL_BASE", ""),
		LocalUploadDir:     getEnv("LOCAL_UPLOAD_DIR", "./uploads"),
		LocalUploadBaseURL: getEnv("LOCAL_UPLOAD_BASE_URL", "http://localhost:"+getEnv("PORT", "8080")+"/uploads"),
		MediaMaxUploadMB:   getEnvAsInt("MEDIA_MAX_UPLOAD_MB", 15),
	}, nil
}

// NewStorage picks S3 when S3_BUCKET is set, local disk otherwise, and
// returns the constructed backend along with a human-readable label for
// startup logging (see main.go).
func (c *Config) NewStorage(ctx context.Context) (storage.Storage, string, error) {
	if c.S3Bucket != "" {
		s3Storage, err := storage.NewS3Storage(ctx, storage.S3Config{
			Bucket:          c.S3Bucket,
			Region:          c.S3Region,
			Endpoint:        c.S3Endpoint,
			AccessKeyID:     c.S3AccessKeyID,
			SecretAccessKey: c.S3SecretAccessKey,
			UsePathStyle:    c.S3UsePathStyle,
			PublicURLBase:   c.S3PublicURLBase,
		})
		if err != nil {
			return nil, "", err
		}
		return s3Storage, fmt.Sprintf("S3 (bucket=%s)", c.S3Bucket), nil
	}

	localStorage, err := storage.NewLocalStorage(c.LocalUploadDir, c.LocalUploadBaseURL)
	if err != nil {
		return nil, "", err
	}
	return localStorage, fmt.Sprintf("local disk (dir=%s)", c.LocalUploadDir), nil
}

// InitDatabase initializes database connections
func (c *Config) InitDatabase() error {
	// Initialize PostgreSQL
	dbConfig := &DatabaseConfig{
		Host:     c.DBHost,
		Port:     c.DBPort,
		User:     c.DBUser,
		Password: c.DBPassword,
		DBName:   c.DBName,
		SSLMode:  c.DBSSLMode,
	}

	db, err := NewPostgresDB(dbConfig)
	if err != nil {
		return err
	}
	c.DB = db

	// Initialize Redis
	redisConfig := &RedisConfig{
		Host:     c.RedisHost,
		Port:     c.RedisPort,
		Password: c.RedisPassword,
		DB:       c.RedisDB,
	}

	redisClient, err := NewRedisClient(redisConfig)
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v", err)
	} else {
		c.Redis = redisClient
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := parseInt(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func parseInt(s string) (int, error) {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}

// getEnvAsSlice parses a comma-separated env var into a trimmed, non-empty
// string slice.
func getEnvAsSlice(key, defaultValue string) []string {
	value := getEnv(key, defaultValue)
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func getEnvAsBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	switch value {
	case "true", "1":
		return true
	case "false", "0":
		return false
	default:
		return defaultValue
	}
}
