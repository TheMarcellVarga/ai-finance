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
	"github.com/marcellvarga/ai-finance/services/api/internal/providers"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
)

func main() {
	cfg := config.FromEnv()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))

	authenticator, err := auth.NewAuthenticator(cfg.Auth, logger)
	if err != nil {
		logger.Error("failed to configure auth", "error", err)
		os.Exit(1)
	}
	researchRuntime, err := research.OpenRuntime(context.Background(), research.RuntimeConfig{
		PersistenceMode:                  cfg.ResearchPersistence,
		DatabaseURL:                      cfg.DatabaseURL,
		StorageMode:                      cfg.DocumentStorage,
		StorageDir:                       cfg.DocumentStorageDir,
		SupabaseURL:                      cfg.SupabaseURL,
		SupabaseKey:                      cfg.SupabaseServiceKey,
		EmbeddingProvider:                cfg.ResearchEmbeddingProvider,
		EmbeddingModel:                   cfg.ResearchEmbeddingModel,
		OpenAIAPIKey:                     cfg.OpenAIAPIKey,
		ExternalCallsEnabled:             cfg.AIExternalCallsEnabled,
		Production:                       cfg.Environment == "production",
		AllowLocalEmbeddingsInProduction: cfg.AllowLocalEmbeddingsInProduction,
	})
	if err != nil {
		logger.Error("failed to configure research runtime", "error", err)
		os.Exit(1)
	}
	defer researchRuntime.Close()

	fmp := providers.FMPProvider{APIKey: cfg.FMPAPIKey}
	twelveData := providers.TwelveDataProvider{APIKey: cfg.TwelveDataAPIKey}
	marketData := providers.FallbackMarketProvider{Primary: fmp, Secondary: twelveData}
	handler := httpapi.NewHandler(httpapi.Options{
		Authenticator: authenticator,
		AssetProvider: marketData,
		QuoteProvider: marketData,
		ChartProvider: twelveData,
		Research:      researchRuntime.Store,
		DocumentStore: researchRuntime.Storage,
		Logger:        logger,
	})

	server := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if researchRuntime.Store.PersistenceMode() == "memory" {
		parser, parserErr := research.NewPageAwareParser(cfg.PDFToTextPath)
		if parserErr != nil {
			logger.Error("failed to configure embedded document worker", "error", parserErr)
			os.Exit(1)
		}
		go research.RunWorker(
			ctx,
			&research.Processor{
				Store: researchRuntime.Store, Storage: researchRuntime.Storage,
				Parser: parser, Chunker: research.NewPageWindowChunker(),
				Embedder: researchRuntime.Embedder, Logger: logger,
			},
			"embedded-document-worker",
			cfg.WorkerPollInterval,
			logger,
		)
	}

	go func() {
		logger.Info(
			"api listening",
			"addr", server.Addr,
			"authMode", cfg.Auth.Mode,
			"researchPersistence", researchRuntime.Store.PersistenceMode(),
			"documentStorage", researchRuntime.Storage.Mode(),
		)
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
