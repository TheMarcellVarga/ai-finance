package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/marcellvarga/ai-finance/services/api/internal/auth"
	"github.com/marcellvarga/ai-finance/services/api/internal/config"
	"github.com/marcellvarga/ai-finance/services/api/internal/httpapi"
	"github.com/marcellvarga/ai-finance/services/api/internal/store"
)

func main() {
	cfg := config.FromEnv()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))

	authenticator, err := auth.NewAuthenticator(cfg.Auth, logger)
	if err != nil {
		logger.Error("failed to configure auth", "error", err)
		os.Exit(1)
	}

	handler := httpapi.NewHandler(httpapi.Options{
		Authenticator: authenticator,
		Assets:        store.NewSeedAssetStore(),
		Logger:        logger,
	})

	server := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("api listening", "addr", server.Addr, "authMode", cfg.Auth.Mode)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("api server failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("api shutdown failed", "error", err)
		os.Exit(1)
	}
}
