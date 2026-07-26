package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"gorm.io/gorm"
)

// RunMigrations runs database migrations
func RunMigrations(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	driver, err := postgres.WithInstance(sqlDB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	// Get migration path
	migrationPath := os.Getenv("MIGRATION_PATH")
	if migrationPath == "" {
		// Try to find migrations directory
		migrationPath = "file://migrations"
	}

	// Check if migrations directory exists
	if _, err := os.Stat("migrations"); os.IsNotExist(err) {
		log.Println("Migrations directory not found, skipping migrations")
		return nil
	}

	// Create migrate instance
	m, err := migrate.NewWithDatabaseInstance(
		migrationPath,
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Migrations applied successfully")
	return nil
}

// GetMigrationsPath returns the absolute path to migrations
func GetMigrationsPath() (string, error) {
	// Try multiple possible locations
	paths := []string{
		"migrations",
		"./migrations",
		"../migrations",
		filepath.Join(os.Getenv("PWD"), "migrations"),
	}

	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			absPath, err := filepath.Abs(p)
			if err == nil {
				return "file://" + absPath, nil
			}
		}
	}

	return "", fmt.Errorf("migrations directory not found")
}
