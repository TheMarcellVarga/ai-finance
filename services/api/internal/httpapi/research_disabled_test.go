package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDisabledResearchDoesNotAffectHealth(t *testing.T) {
	handler := NewHandler(Options{})
	for _, tc := range []struct {
		path string
		want int
	}{
		{"/v1/research/workspaces", http.StatusServiceUnavailable},
		{"/v1/health", http.StatusOK},
	} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, tc.path, nil))
		if response.Code != tc.want {
			t.Fatalf("%s: got %d, want %d", tc.path, response.Code, tc.want)
		}
		if tc.want == http.StatusServiceUnavailable && !strings.Contains(response.Body.String(), "research_disabled") {
			t.Fatalf("missing stable research_disabled code: %s", response.Body.String())
		}
	}
}
