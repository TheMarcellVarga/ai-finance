package auth

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Claims struct {
	Subject   string     `json:"sub"`
	Issuer    string     `json:"iss"`
	Audience  audience   `json:"aud"`
	Email     string     `json:"email"`
	ExpiresAt int64      `json:"exp"`
	NotBefore int64      `json:"nbf"`
	IssuedAt  int64      `json:"iat"`
	Raw       jwtPayload `json:"-"`
}

type audience []string

func (a *audience) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		*a = audience{single}
		return nil
	}

	var many []string
	if err := json.Unmarshal(data, &many); err != nil {
		return err
	}
	*a = many
	return nil
}

func (c Claims) HasAudience(expected string) bool {
	for _, value := range c.Audience {
		if value == expected {
			return true
		}
	}
	return false
}

func (c Claims) ValidTime(now time.Time) bool {
	unix := now.Unix()
	if c.ExpiresAt > 0 && unix >= c.ExpiresAt {
		return false
	}
	if c.NotBefore > 0 && unix < c.NotBefore {
		return false
	}
	if c.IssuedAt > 0 && unix+60 < c.IssuedAt {
		return false
	}
	return true
}

type jwtPayload map[string]any

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	KeyType string `json:"kty"`
	KeyID   string `json:"kid"`
	Use     string `json:"use"`
	Alg     string `json:"alg"`
	N       string `json:"n"`
	E       string `json:"e"`
}

type JWKSVerifier struct {
	url      string
	ttl      time.Duration
	client   *http.Client
	mu       sync.Mutex
	keys     map[string]*rsa.PublicKey
	fetched  time.Time
	fetching bool
}

func NewJWKSVerifier(url string, ttl time.Duration) *JWKSVerifier {
	return &JWKSVerifier{
		url:    url,
		ttl:    ttl,
		client: &http.Client{Timeout: 5 * time.Second},
		keys:   map[string]*rsa.PublicKey{},
	}
}

func (v *JWKSVerifier) Verify(ctx context.Context, token string) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, errors.New("invalid jwt shape")
	}

	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := decodeSegment(parts[0], &header); err != nil {
		return Claims{}, fmt.Errorf("decode jwt header: %w", err)
	}
	if header.Alg != "RS256" || header.Kid == "" {
		return Claims{}, errors.New("unsupported jwt header")
	}

	key, err := v.key(ctx, header.Kid)
	if err != nil {
		return Claims{}, err
	}

	signed := parts[0] + "." + parts[1]
	signature, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return Claims{}, errors.New("invalid jwt signature encoding")
	}
	digest := sha256.Sum256([]byte(signed))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], signature); err != nil {
		return Claims{}, errors.New("invalid jwt signature")
	}

	var claims Claims
	if err := decodeSegment(parts[1], &claims); err != nil {
		return Claims{}, fmt.Errorf("decode jwt claims: %w", err)
	}
	var raw jwtPayload
	if err := decodeSegment(parts[1], &raw); err == nil {
		claims.Raw = raw
	}
	return claims, nil
}

func (v *JWKSVerifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	key := v.keys[kid]
	needsFetch := key == nil || time.Since(v.fetched) > v.ttl
	v.mu.Unlock()

	if needsFetch {
		if err := v.refresh(ctx); err != nil {
			return nil, err
		}
	}

	v.mu.Lock()
	defer v.mu.Unlock()
	key = v.keys[kid]
	if key == nil {
		return nil, errors.New("jwt key not found")
	}
	return key, nil
}

func (v *JWKSVerifier) refresh(ctx context.Context) error {
	if v.url == "" {
		return errors.New("jwks url is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.url, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("jwks fetch failed: status %d", resp.StatusCode)
	}

	var body jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return err
	}

	keys := map[string]*rsa.PublicKey{}
	for _, key := range body.Keys {
		publicKey, err := key.publicKey()
		if err != nil {
			continue
		}
		keys[key.KeyID] = publicKey
	}
	if len(keys) == 0 {
		return errors.New("jwks response contained no usable rsa keys")
	}

	v.mu.Lock()
	defer v.mu.Unlock()
	v.keys = keys
	v.fetched = time.Now()
	return nil
}

func (k jwkKey) publicKey() (*rsa.PublicKey, error) {
	if k.KeyType != "RSA" || k.KeyID == "" || k.N == "" || k.E == "" {
		return nil, errors.New("unsupported jwk")
	}

	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, err
	}

	exponent := 0
	for _, b := range eBytes {
		exponent = exponent<<8 + int(b)
	}
	if exponent == 0 {
		return nil, errors.New("invalid jwk exponent")
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: exponent,
	}, nil
}

func decodeSegment[T any](segment string, target *T) error {
	decoded, err := base64.RawURLEncoding.DecodeString(segment)
	if err != nil {
		return err
	}
	return json.Unmarshal(decoded, target)
}
