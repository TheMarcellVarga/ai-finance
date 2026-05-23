package auth

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestJWKSVerifierValidatesSignedJWT(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}

	kid := "test-key"
	jwks := map[string]any{"keys": []map[string]string{{
		"kty": "RSA",
		"kid": kid,
		"alg": "RS256",
		"use": "sig",
		"n":   base64.RawURLEncoding.EncodeToString(privateKey.PublicKey.N.Bytes()),
		"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(privateKey.PublicKey.E)).Bytes()),
	}}}
	jwksBytes, _ := json.Marshal(jwks)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(jwksBytes)
	}))
	defer server.Close()

	token, err := signTestJWT(privateKey, kid, map[string]any{
		"sub": "user_123",
		"iss": "https://clerk.example.test",
		"aud": []string{"finance-api"},
		"exp": time.Now().Add(time.Minute).Unix(),
		"iat": time.Now().Add(-time.Minute).Unix(),
	})
	if err != nil {
		t.Fatal(err)
	}

	verifier := NewJWKSVerifier(server.URL, time.Minute)
	claims, err := verifier.Verify(context.Background(), token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.Subject != "user_123" || !claims.HasAudience("finance-api") {
		t.Fatalf("unexpected claims: %#v", claims)
	}
}

func signTestJWT(privateKey *rsa.PrivateKey, kid string, claims map[string]any) (string, error) {
	header := map[string]any{"alg": "RS256", "typ": "JWT", "kid": kid}
	headerBytes, _ := json.Marshal(header)
	claimsBytes, _ := json.Marshal(claims)
	unsigned := base64.RawURLEncoding.EncodeToString(headerBytes) + "." + base64.RawURLEncoding.EncodeToString(claimsBytes)
	digest := sha256.Sum256([]byte(unsigned))
	signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}
