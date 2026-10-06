package httpapi

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/flipdigest"
)

func validFlipPreferences(value flipdigest.Preferences) bool {
	return (value.Direction == "bull" || value.Direction == "bear" || value.Direction == "both") &&
		(value.Cadence == "daily" || value.Cadence == "weekly") &&
		(!value.Enabled || value.EmailEnabled || value.InAppEnabled)
}

func (s *server) getFlipDigestPreferences(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	value, err := s.flipDigests.GetPreferences(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Flip digest settings are unavailable.")
		return
	}
	writeJSON(w, 200, map[string]any{"data": value})
}

func (s *server) putFlipDigestPreferences(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	var value flipdigest.Preferences
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if err := decodeJSON(r, &value); err != nil || !validFlipPreferences(value) {
		writeError(w, r, 400, "invalid_flip_digest_preferences", "Choose a valid direction, cadence, and at least one delivery channel.")
		return
	}
	stored, err := s.flipDigests.SavePreferences(r.Context(), principal.ClerkUserID, value)
	if err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Flip digest settings could not be saved.")
		return
	}
	s.writeAudit(r, principal, "flip_digest.preferences_updated", "flip_digest_preferences", principal.ClerkUserID,
		map[string]any{"enabled": stored.Enabled, "direction": stored.Direction, "cadence": stored.Cadence, "emailEnabled": stored.EmailEnabled, "inAppEnabled": stored.InAppEnabled})
	writeJSON(w, 200, map[string]any{"data": stored})
}

func (s *server) listFlipDigestNotifications(w http.ResponseWriter, r *http.Request) {
	principal, _ := auth.PrincipalFromContext(r.Context())
	items, err := s.flipDigests.ListNotifications(r.Context(), principal.ClerkUserID)
	if err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Flip digests are unavailable.")
		return
	}
	writeJSON(w, 200, map[string]any{"data": items})
}

func (s *server) requireFlipDigestJob(w http.ResponseWriter, r *http.Request) bool {
	secret := s.flipDigestJobSecret
	provided := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if secret == "" || len(provided) != len(secret) || subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
		writeError(w, r, 401, "unauthorized", "Job authorization is required.")
		return false
	}
	return true
}

func (s *server) flipDigestSubscribers(w http.ResponseWriter, r *http.Request) {
	if !s.requireFlipDigestJob(w, r) {
		return
	}
	items, err := s.flipDigests.Subscribers(r.Context())
	if err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Subscribers are unavailable.")
		return
	}
	writeJSON(w, 200, map[string]any{"data": items})
}

func (s *server) flipDigestPendingEmails(w http.ResponseWriter, r *http.Request) {
	if !s.requireFlipDigestJob(w, r) {
		return
	}
	items, err := s.flipDigests.PendingEmails(r.Context())
	if err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Pending emails are unavailable.")
		return
	}
	writeJSON(w, 200, map[string]any{"data": items})
}

func (s *server) createFlipDigestNotification(w http.ResponseWriter, r *http.Request) {
	if !s.requireFlipDigestJob(w, r) {
		return
	}
	var body struct {
		UserID       string                  `json:"userId"`
		Notification flipdigest.Notification `json:"notification"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 131072)
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil ||
		strings.TrimSpace(body.UserID) == "" || len(body.UserID) > 160 ||
		body.Notification.PeriodEnd.Before(body.Notification.PeriodStart) ||
		body.Notification.PeriodEnd.After(time.Now().UTC().Add(2*time.Hour)) ||
		(body.Notification.Cadence != "daily" && body.Notification.Cadence != "weekly") ||
		(body.Notification.Direction != "bull" && body.Notification.Direction != "bear" && body.Notification.Direction != "both") ||
		len(body.Notification.Entries) == 0 || len(body.Notification.Entries) > 250 {
		writeError(w, r, 400, "invalid_flip_digest", "A bounded confirmed-flip digest is required.")
		return
	}
	for _, entry := range body.Notification.Entries {
		flipTime, err := time.Parse(time.RFC3339, entry.LastFlipAt)
		if err != nil || flipTime.Before(body.Notification.PeriodStart) || !flipTime.Before(body.Notification.PeriodEnd) ||
			(entry.Direction != "bull" && entry.Direction != "bear") ||
			(body.Notification.Direction != "both" && entry.Direction != body.Notification.Direction) ||
			entry.AssetClass == "" || len(entry.AssetClass) > 40 ||
			entry.Symbol == "" || len(entry.Symbol) > 40 || len(entry.Name) > 120 ||
			len(entry.Source) > 120 || len(entry.SignalBasis) > 40 {
			writeError(w, r, 400, "invalid_flip_digest", "Flip entries must be recent and bounded.")
			return
		}
	}
	item, created, err := s.flipDigests.CreateNotification(r.Context(), body.UserID, body.Notification)
	if err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Flip digest could not be stored.")
		return
	}
	if item.ID == "" {
		writeError(w, r, 409, "subscription_changed", "The subscription is no longer active.")
		return
	}
	writeJSON(w, 200, map[string]any{"data": item, "created": created})
}

func (s *server) markFlipDigestEmailSent(w http.ResponseWriter, r *http.Request) {
	if !s.requireFlipDigestJob(w, r) {
		return
	}
	id := r.PathValue("id")
	if len(id) == 0 || len(id) > 160 {
		writeError(w, r, 400, "invalid_id", "A notification ID is required.")
		return
	}
	if err := s.flipDigests.MarkEmailSent(r.Context(), id); err != nil {
		writeError(w, r, 500, "flip_digest_unavailable", "Email status could not be stored.")
		return
	}
	writeJSON(w, 200, map[string]any{"status": "ok"})
}
