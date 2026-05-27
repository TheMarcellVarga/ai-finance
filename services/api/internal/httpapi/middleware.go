package httpapi

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
)

func (s *server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.auth == nil {
			writeError(w, r, http.StatusUnauthorized, "auth_not_configured", "Authentication is not configured.")
			return
		}

		principal, err := s.auth.Authenticate(r)
		if err != nil {
			code := "unauthorized"
			if !errors.Is(err, auth.ErrUnauthorized) {
				s.logger.Warn("auth middleware error", "requestId", RequestID(r.Context()), "error", err)
			}
			writeError(w, r, http.StatusUnauthorized, code, "Authentication is required.")
			return
		}

		if !s.enforceMutationRateLimit(w, r, principal) {
			return
		}

		next.ServeHTTP(w, r.WithContext(auth.WithPrincipal(r.Context(), principal)))
	})
}

func accessLog(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", recorder.status,
			"requestId", RequestID(r.Context()),
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
