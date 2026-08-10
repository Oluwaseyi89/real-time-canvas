package jwt

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateAndValidateRoundTrip(t *testing.T) {
	svc := NewService("test-secret", time.Hour)

	token, err := svc.GenerateToken("user-a", "alice")
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}

	claims, err := svc.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken returned error for a token it just issued: %v", err)
	}
	if claims.UserID != "user-a" || claims.Username != "alice" {
		t.Fatalf("claims mismatch: got %+v", claims)
	}
}

func TestValidateTokenRejectsForgedSignature(t *testing.T) {
	issuer := NewService("real-secret", time.Hour)
	attacker := NewService("guessed-secret", time.Hour)

	// A token minted for user-a, but signed with a different secret than
	// the server actually uses — simulates a forged/tampered token.
	forged, err := attacker.GenerateToken("user-a", "alice")
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}

	if _, err := issuer.ValidateToken(forged); err == nil {
		t.Fatal("ValidateToken accepted a token signed with the wrong secret")
	}
}

func TestValidateTokenRejectsMissingAndGarbageTokens(t *testing.T) {
	svc := NewService("test-secret", time.Hour)

	for _, tok := range []string{"", "not-a-jwt", "a.b.c"} {
		if _, err := svc.ValidateToken(tok); err == nil {
			t.Fatalf("ValidateToken accepted garbage input %q", tok)
		}
	}
}

func TestValidateTokenRejectsExpiredToken(t *testing.T) {
	svc := NewService("test-secret", -time.Minute) // already-expired TTL

	token, err := svc.GenerateToken("user-a", "alice")
	if err != nil {
		t.Fatalf("GenerateToken returned error: %v", err)
	}

	if _, err := svc.ValidateToken(token); err == nil {
		t.Fatal("ValidateToken accepted an expired token")
	}
}

func TestValidateTokenRejectsAlgNoneAttack(t *testing.T) {
	svc := NewService("test-secret", time.Hour)

	// A classic JWT attack: a token claiming alg:"none" with no signature,
	// hoping a naive verifier skips signature checking entirely.
	claims := Claims{
		UserID:   "user-a",
		Username: "alice",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	unsigned := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	token, err := unsigned.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("failed to build alg:none token: %v", err)
	}

	if _, err := svc.ValidateToken(token); err == nil {
		t.Fatal("ValidateToken accepted an alg:none token")
	}
}

