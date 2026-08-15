package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage writes uploads to a directory on disk, served back out by
// router.Static("/uploads", baseDir) (see api/routes.go) — the fallback
// used whenever S3 isn't configured (see config.Load / NewStorage).
type LocalStorage struct {
	baseDir string
	baseURL string
}

// NewLocalStorage creates the upload directory if it doesn't exist yet and
// returns a Storage that writes into it. baseURL is the public prefix
// clients GET files back from (e.g. "http://localhost:8080/uploads").
func NewLocalStorage(baseDir, baseURL string) (*LocalStorage, error) {
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}
	return &LocalStorage{
		baseDir: baseDir,
		baseURL: strings.TrimSuffix(baseURL, "/"),
	}, nil
}

func (s *LocalStorage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	// key can contain "/" (room-namespaced), so the room's subdirectory
	// needs to exist before the file itself is created.
	destPath := filepath.Join(s.baseDir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(destPath), 0o755); err != nil {
		return "", fmt.Errorf("create destination dir: %w", err)
	}

	f, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, reader); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return s.baseURL + "/" + key, nil
}
