package research

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RuntimeConfig struct {
	PersistenceMode                  string
	DatabaseURL                      string
	StorageMode                      string
	StorageDir                       string
	SupabaseURL                      string
	SupabaseKey                      string
	EmbeddingProvider                string
	EmbeddingModel                   string
	OpenAIAPIKey                     string
	ExternalCallsEnabled             bool
	Production                       bool
	AllowLocalEmbeddingsInProduction bool
}

type Runtime struct {
	Store    Store
	Storage  ObjectStorage
	Embedder Embedder
	pool     *pgxpool.Pool
}

func OpenRuntime(ctx context.Context, cfg RuntimeConfig) (*Runtime, error) {
	runtime := &Runtime{}
	switch strings.ToLower(strings.TrimSpace(cfg.PersistenceMode)) {
	case "memory":
		runtime.Store = NewMemoryStore()
	case "postgres":
		if strings.TrimSpace(cfg.DatabaseURL) == "" {
			return nil, errors.New("DATABASE_URL is required for postgres research persistence")
		}
		pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
		if err != nil {
			return nil, fmt.Errorf("open research database: %w", err)
		}
		if err := pool.Ping(ctx); err != nil {
			pool.Close()
			return nil, fmt.Errorf("ping research database: %w", err)
		}
		runtime.pool = pool
		runtime.Store = NewPostgresStore(pool)
	default:
		return nil, fmt.Errorf("unsupported RESEARCH_PERSISTENCE_MODE %q", cfg.PersistenceMode)
	}

	switch strings.ToLower(strings.TrimSpace(cfg.StorageMode)) {
	case "memory":
		runtime.Storage = NewMemoryStorage()
	case "local":
		storage, err := NewLocalStorage(cfg.StorageDir)
		if err != nil {
			runtime.Close()
			return nil, fmt.Errorf("open local document storage: %w", err)
		}
		runtime.Storage = storage
	case "supabase":
		storage, err := NewSupabaseStorage(cfg.SupabaseURL, cfg.SupabaseKey)
		if err != nil {
			runtime.Close()
			return nil, err
		}
		runtime.Storage = storage
	default:
		runtime.Close()
		return nil, fmt.Errorf("unsupported DOCUMENT_STORAGE_MODE %q", cfg.StorageMode)
	}
	embedder, err := NewEmbedder(EmbedderConfig{
		Provider:             cfg.EmbeddingProvider,
		Model:                cfg.EmbeddingModel,
		OpenAIAPIKey:         cfg.OpenAIAPIKey,
		ExternalCallsEnabled: cfg.ExternalCallsEnabled,
		Production:           cfg.Production,
		AllowLocalProduction: cfg.AllowLocalEmbeddingsInProduction,
	})
	if err != nil {
		runtime.Close()
		return nil, fmt.Errorf("configure research embeddings: %w", err)
	}
	runtime.Embedder = embedder
	return runtime, nil
}

func (r *Runtime) Close() {
	if r != nil && r.pool != nil {
		r.pool.Close()
	}
}
