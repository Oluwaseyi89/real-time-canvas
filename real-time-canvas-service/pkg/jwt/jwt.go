// Package jwt issues and validates the signed tokens that replace the
// service's previous "trust whatever X-User-ID header the client sends"
// auth model.
package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken covers every way a token can fail to validate: bad
// signature, wrong signing method, expired, or malformed. Callers only need
// to distinguish "valid" from "not," so the underlying library error isn't
// exposed.
var ErrInvalidToken = errors.New("invalid or expired token")

// Claims identifies the authenticated user a token was issued for.
type Claims struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Service issues and validates JWTs signed with a single HMAC secret.
type Service struct {
	secret []byte
	ttl    time.Duration
}

// NewService creates a JWT service. secret must be non-empty — callers are
// expected to fail startup rather than run with an empty signing key.
func NewService(secret string, ttl time.Duration) *Service {
	return &Service{secret: []byte(secret), ttl: ttl}
}

// GenerateToken issues a signed token for the given user, valid for the
// service's configured TTL.
func (s *Service) GenerateToken(userID, username string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// ValidateToken verifies signature, expiry, and signing method, returning
// the claims embedded in the token. A caller can trust claims.UserID
// exactly because it came from a signature only the server could have
// produced — unlike the header/query-param based identity this replaces,
// nothing here is client-suppliable.
func (s *Service) ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		// Pin the signing method: without this check, a token signed with
		// "none" or a different algorithm the server never intended to
		// trust could otherwise pass parsing.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, ErrInvalidToken
	}
	if !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
