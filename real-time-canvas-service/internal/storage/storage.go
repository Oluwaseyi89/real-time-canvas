// Package storage abstracts where uploaded media bytes end up. Two
// implementations exist — S3-compatible object storage and the local
// filesystem — selected once at startup by NewStorage based on which S3
// env vars are set (see config.Load). Callers (media_service.go) only ever
// see this interface, so the choice of backend is invisible above this
// package.
package storage

import (
	"context"
	"io"
)

// Storage saves uploaded media and returns a URL clients can GET it back
// from. `key` is a caller-chosen path-like identifier (e.g.
// "{roomId}/{uuid}.png") used to namespace objects/files per room.
type Storage interface {
	Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (url string, err error)
}
