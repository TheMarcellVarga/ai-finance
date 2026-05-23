package config

import (
	"log/slog"
	"os"
	"strings"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
)

type Config struct {
	Host     string
	Port     string
	LogLevel slog.Level
	Auth     auth.Config
}

func FromEnv() Config {
	env := getenv("APP_ENV", "development")
	authMode := getenv("API_AUTH_MODE", "")
	if authMode == "" {
		authMode = "clerk"
		if env == "development" && os.Getenv("CLERK_JWKS_URL") == "" {
			authMode = "dev"
		}
	}

	return Config{
		Host:     getenv("HOST", "127.0.0.1"),
		Port:     getenv("PORT", "8080"),
		LogLevel: parseLogLevel(getenv("LOG_LEVEL", "info")),
		Auth: auth.Config{
			Mode:      authMode,
			Env:       env,
			Issuer:    os.Getenv("CLERK_JWT_ISSUER"),
			Audience:  os.Getenv("CLERK_JWT_AUDIENCE"),
			JWKSURL:   os.Getenv("CLERK_JWKS_URL"),
			DevPrefix: getenv("API_DEV_AUTH_PREFIX", "dev:"),
		},
	}
}

func (c Config) Addr() string {
	return c.Host + ":" + c.Port
}

func getenv(key string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func parseLogLevel(value string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
