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
	"github.com/marcellvarga/ai-finance/services/api/internal/db"
	"github.com/marcellvarga/ai-finance/services/api/internal/flipdigest"
	"github.com/marcellvarga/ai-finance/services/api/internal/httpapi"
	"github.com/marcellvarga/ai-finance/services/api/internal/providers"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
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
	var researchRuntime *research.Runtime
	if !cfg.ResearchDisabled {
		researchRuntime, err = research.OpenRuntime(context.Background(), research.RuntimeConfig{
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
	}

	var workspace store.WorkspaceRepository = store.NewWorkspaceStore()
	var flipDigests flipdigest.Repository = flipdigest.NewMemoryStore()
	var workspacePoolCloser func()
	if cfg.DatabaseURL != "" {
		workspacePool, poolErr := db.OpenPool(context.Background(), cfg.DatabaseURL)
		if poolErr != nil {
			logger.Error("failed to open workspace database", "error", poolErr)
			os.Exit(1)
		}
		if poolErr = workspacePool.Ping(context.Background()); poolErr != nil {
			workspacePool.Close()
			logger.Error("failed to ping workspace database", "error", poolErr)
			os.Exit(1)
		}
		workspace = store.NewPostgresWorkspaceStore(workspacePool)
		flipDigests = flipdigest.NewPostgresStore(workspacePool)
		workspacePoolCloser = workspacePool.Close
	} else if cfg.Environment == "production" {
		logger.Error("DATABASE_URL is required for persistent finance workspaces")
		os.Exit(1)
	} else {
		logger.Warn("DATABASE_URL is not configured; finance workspaces will reset when the API restarts")
	}
	if workspacePoolCloser != nil {
		defer workspacePoolCloser()
	}

	fmp := providers.FMPProvider{APIKey: cfg.FMPAPIKey}
	twelveData := providers.TwelveDataProvider{APIKey: cfg.TwelveDataAPIKey}
	freeMarketMonitors := providers.FreeMarketMonitorProvider{}
	marketData := providers.FallbackMarketProvider{Primary: fmp, Secondary: twelveData, Tertiary: freeMarketMonitors}
	options := httpapi.Options{
		Authenticator: authenticator,
		AssetProvider: marketData,
		QuoteProvider: marketData,
		ChartProvider: twelveData,
		MarketMonitor: freeMarketMonitors,
		Workspace:     workspace,
		FlipDigests:   flipDigests,
		Logger:        logger,
	}
	if researchRuntime != nil {
		options.Research = researchRuntime.Store
		options.ResearchEmbedder = researchRuntime.Embedder
		options.DocumentStore = researchRuntime.Storage
	}
	handler := httpapi.NewHandler(options)

	server := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if researchRuntime != nil && researchRuntime.Store.PersistenceMode() == "memory" {
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
		researchPersistence, documentStorage := "disabled", "disabled"
		if researchRuntime != nil {
			researchPersistence = researchRuntime.Store.PersistenceMode()
			documentStorage = researchRuntime.Storage.Mode()
		}
		logger.Info(
			"api listening",
			"addr", server.Addr,
			"authMode", cfg.Auth.Mode,
			"researchPersistence", researchPersistence,
			"documentStorage", documentStorage,
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
