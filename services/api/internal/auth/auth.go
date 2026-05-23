package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type contextKey struct{}

type Principal struct {
	ClerkUserID string
	Email       string
	Issuer      string
}

type Config struct {
	Mode      string
	Env       string
	Issuer    string
	Audience  string
	JWKSURL   string
	DevPrefix string
}

type Authenticator struct {
	cfg    Config
	jwks   *JWKSVerifier
	logger *slog.Logger
}

var ErrUnauthorized = errors.New("unauthorized")

func NewAuthenticator(cfg Config, logger *slog.Logger) (*Authenticator, error) {
	if logger == nil {
		logger = slog.Default()
	}

	switch cfg.Mode {
	case "dev":
		if cfg.Env == "production" {
			return nil, errors.New("dev auth mode is disabled in production")
		}
		if cfg.DevPrefix == "" {
			cfg.DevPrefix = "dev:"
		}
	case "clerk":
		if cfg.Issuer == "" {
			return nil, errors.New("CLERK_JWT_ISSUER is required for clerk auth")
		}
		if cfg.JWKSURL == "" {
			return nil, errors.New("CLERK_JWKS_URL is required for clerk auth")
		}
	default:
		return nil, fmt.Errorf("unsupported API_AUTH_MODE %q", cfg.Mode)
	}

	return &Authenticator{
		cfg:    cfg,
		jwks:   NewJWKSVerifier(cfg.JWKSURL, 5*time.Minute),
		logger: logger,
	}, nil
}

func (a *Authenticator) Authenticate(r *http.Request) (Principal, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return Principal{}, ErrUnauthorized
	}

	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || strings.TrimSpace(token) == "" {
		return Principal{}, ErrUnauthorized
	}

	if a.cfg.Mode == "dev" {
		sub, ok := strings.CutPrefix(token, a.cfg.DevPrefix)
		if !ok || strings.TrimSpace(sub) == "" {
			return Principal{}, ErrUnauthorized
		}
		return Principal{ClerkUserID: strings.TrimSpace(sub), Issuer: "dev"}, nil
	}

	claims, err := a.jwks.Verify(r.Context(), token)
	if err != nil {
		a.logger.Warn("jwt verification failed", "error", err)
		return Principal{}, ErrUnauthorized
	}
	if claims.Subject == "" || claims.Issuer != a.cfg.Issuer {
		return Principal{}, ErrUnauthorized
	}
	if a.cfg.Audience != "" && !claims.HasAudience(a.cfg.Audience) {
		return Principal{}, ErrUnauthorized
	}

	now := time.Now()
	if !claims.ValidTime(now) {
		return Principal{}, ErrUnauthorized
	}

	return Principal{
		ClerkUserID: claims.Subject,
		Email:       claims.Email,
		Issuer:      claims.Issuer,
	}, nil
}

func WithPrincipal(ctx context.Context, principal Principal) context.Context {
	return context.WithValue(ctx, contextKey{}, principal)
}

func PrincipalFromContext(ctx context.Context) (Principal, bool) {
	principal, ok := ctx.Value(contextKey{}).(Principal)
	return principal, ok
}
