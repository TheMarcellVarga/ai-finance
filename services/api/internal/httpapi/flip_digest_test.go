package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/flipdigest"
)

func TestFlipDigestAuthOwnershipAndJobSecret(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	authenticator, err := auth.NewAuthenticator(auth.Config{Mode: "dev", Env: "test", DevPrefix: "dev:"}, logger)
	if err != nil {
		t.Fatal(err)
	}
	handler := NewHandler(Options{Authenticator: authenticator, FlipDigests: flipdigest.NewMemoryStore(), FlipDigestJobSecret: "test-job-secret", Logger: logger})

	request := func(method, path, authHeader string, body []byte) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(method, path, bytes.NewReader(body))
		if authHeader != "" {
			r.Header.Set("Authorization", authHeader)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	if status := request(http.MethodGet, "/v1/flip-digest/preferences", "", nil).Code; status != 401 {
		t.Fatalf("expected auth gate: %d", status)
	}
	if status := request(http.MethodGet, "/v1/internal/flip-digest/subscribers", "Bearer wrong", nil).Code; status != 401 {
		t.Fatalf("expected job gate: %d", status)
	}
	settings := []byte(`{"enabled":true,"direction":"bull","cadence":"daily","emailEnabled":false,"inAppEnabled":true}`)
	if status := request(http.MethodPut, "/v1/flip-digest/preferences", "Bearer dev:user-a", settings).Code; status != 200 {
		t.Fatalf("save settings: %d", status)
	}
	other := request(http.MethodGet, "/v1/flip-digest/preferences", "Bearer dev:user-b", nil)
	var otherBody struct {
		Data flipdigest.Preferences `json:"data"`
	}
	if err := json.Unmarshal(other.Body.Bytes(), &otherBody); err != nil {
		t.Fatal(err)
	}
	if otherBody.Data.Enabled {
		t.Fatal("another user inherited the subscription")
	}

	end := time.Now().UTC().Truncate(time.Hour)
	start := end.Add(-time.Hour)
	jobBody, err := json.Marshal(map[string]any{"userId": "user-a", "notification": map[string]any{
		"periodStart": start, "periodEnd": end, "direction": "bull", "cadence": "daily",
		"entries":  []map[string]any{{"assetClass": "equities", "symbol": "AAPL", "name": "Apple", "direction": "bull", "lastFlipAt": start.Format(time.RFC3339), "source": "test", "capturedAt": end.Format(time.RFC3339), "signalBasis": "ohlc"}},
		"coverage": map[string]any{"scannedClasses": []string{"equities"}, "failedClasses": []string{}, "generatedAt": end.Format(time.RFC3339)},
	}})
	if err != nil {
		t.Fatal(err)
	}
	if status := request(http.MethodPost, "/v1/internal/flip-digest/notifications", "Bearer test-job-secret", jobBody).Code; status != 200 {
		t.Fatalf("create notification: %d", status)
	}
	userA := request(http.MethodGet, "/v1/flip-digest/notifications", "Bearer dev:user-a", nil)
	userB := request(http.MethodGet, "/v1/flip-digest/notifications", "Bearer dev:user-b", nil)
	var a, b struct {
		Data []flipdigest.Notification `json:"data"`
	}
	if err := json.Unmarshal(userA.Body.Bytes(), &a); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(userB.Body.Bytes(), &b); err != nil {
		t.Fatal(err)
	}
	if len(a.Data) != 1 || len(b.Data) != 0 {
		t.Fatalf("notification ownership failed: a=%d b=%d", len(a.Data), len(b.Data))
	}
}
