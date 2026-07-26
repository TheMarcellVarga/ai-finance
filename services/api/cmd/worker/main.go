package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/marcellvarga/ai-finance/services/api/internal/config"
	"github.com/marcellvarga/ai-finance/services/api/internal/research"
)

func main() {
	cfg := config.FromEnv()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	runtime, err := research.OpenRuntime(ctx, research.RuntimeConfig{
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
	defer runtime.Close()
	if runtime.Store.PersistenceMode() == "memory" {
		logger.Error("worker requires shared postgres persistence", "persistence", runtime.Store.PersistenceMode())
		os.Exit(1)
	}
	parser, err := research.NewPageAwareParser(cfg.PDFToTextPath)
	if err != nil {
		logger.Error("failed to configure document parser", "error", err)
		os.Exit(1)
	}
	hostname, _ := os.Hostname()
	workerID := "document-worker:" + hostname
	processor := &research.Processor{
		Store: runtime.Store, Storage: runtime.Storage, Parser: parser,
		Chunker: research.NewPageWindowChunker(), Embedder: runtime.Embedder, Logger: logger,
	}

	research.RunWorker(ctx, processor, workerID, cfg.WorkerPollInterval, logger)
}
