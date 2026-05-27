package httpapi

import (
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
)

type entitlementLimits struct {
	Plan       string `json:"plan"`
	Portfolios int    `json:"portfolios"`
	Holdings   int    `json:"holdings"`
	Watchlists int    `json:"watchlists"`
	AIBriefs   int    `json:"aiBriefsPerMonth"`
}

var freeEntitlements = entitlementLimits{
	Plan:       "free",
	Portfolios: 1,
	Holdings:   10,
	Watchlists: 1,
	AIBriefs:   5,
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]rateBucket
	limit   int
	window  time.Duration
}

type rateBucket struct {
	count   int
	resetAt time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{
		buckets: map[string]rateBucket{},
		limit:   limit,
		window:  window,
	}
}

func (l *rateLimiter) Allow(key string) (bool, time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	bucket := l.buckets[key]
	if bucket.resetAt.IsZero() || now.After(bucket.resetAt) {
		bucket = rateBucket{resetAt: now.Add(l.window)}
	}
	bucket.count++
	l.buckets[key] = bucket
	return bucket.count <= l.limit, bucket.resetAt
}

func (s *server) enforceMutationRateLimit(w http.ResponseWriter, r *http.Request, principal auth.Principal) bool {
	if r.Method != http.MethodPost && r.Method != http.MethodPatch && r.Method != http.MethodDelete {
		return true
	}
	allowed, resetAt := s.rateLimiter.Allow(principal.ClerkUserID + ":" + r.Method + ":" + r.URL.Path)
	if allowed {
		return true
	}
	writeJSON(w, http.StatusTooManyRequests, map[string]any{
		"error": map[string]any{
			"code":      "rate_limited",
			"message":   "This finance mutation is temporarily rate-limited.",
			"requestId": RequestID(r.Context()),
			"resetAt":   resetAt.UTC().Format(time.RFC3339),
		},
	})
	return false
}

func (s *server) writeAudit(r *http.Request, principal auth.Principal, action string, entityType string, entityID string, metadata map[string]any) {
	attrs := []any{
		"requestId", RequestID(r.Context()),
		"user", principal.ClerkUserID,
		"action", action,
		"entityType", entityType,
		"entityId", entityID,
	}
	for key, value := range metadata {
		attrs = append(attrs, slog.Any(key, value))
	}
	s.logger.Info("audit", attrs...)
}
