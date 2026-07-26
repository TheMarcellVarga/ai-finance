package research

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"math"
	"net/http"
	"strings"
	"time"
	"unicode"
)

const (
	DefaultEmbeddingDimensions = 1536
	HashEmbeddingProvider      = "local"
	HashEmbeddingModel         = "feature-hash-1536"
	HashEmbeddingVersion       = "hash-embedding-v1"
)

type EmbeddingDescriptor struct {
	Provider      string `json:"provider"`
	Model         string `json:"model"`
	Version       string `json:"version"`
	Dimensions    int    `json:"dimensions"`
	ExternalCalls bool   `json:"externalCalls"`
}

type Embedder interface {
	Descriptor() EmbeddingDescriptor
	Embed(context.Context, []string) ([][]float32, error)
}

type EmbedderConfig struct {
	Provider             string
	Model                string
	OpenAIAPIKey         string
	ExternalCallsEnabled bool
	Production           bool
	AllowLocalProduction bool
	HTTPClient           *http.Client
}

type HashEmbedder struct {
	dimensions int
}

func NewHashEmbedder(dimensions int) *HashEmbedder {
	if dimensions <= 0 {
		dimensions = DefaultEmbeddingDimensions
	}
	return &HashEmbedder{dimensions: dimensions}
}

func (e *HashEmbedder) Descriptor() EmbeddingDescriptor {
	return EmbeddingDescriptor{
		Provider: HashEmbeddingProvider, Model: HashEmbeddingModel,
		Version: HashEmbeddingVersion, Dimensions: e.dimensions, ExternalCalls: false,
	}
}

func (e *HashEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	result := make([][]float32, len(texts))
	for index, text := range texts {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		vector := make([]float32, e.dimensions)
		tokens := embeddingTokens(text)
		for tokenIndex, token := range tokens {
			addHashedFeature(vector, "u:"+token, 1)
			if tokenIndex > 0 {
				addHashedFeature(vector, "b:"+tokens[tokenIndex-1]+" "+token, 0.7)
			}
		}
		normalizeVector(vector)
		result[index] = vector
	}
	return result, nil
}

type OpenAIEmbedder struct {
	apiKey     string
	model      string
	dimensions int
	client     *http.Client
	endpoint   string
}

func NewEmbedder(cfg EmbedderConfig) (Embedder, error) {
	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "", "local", "hash":
		if cfg.Production && !cfg.AllowLocalProduction {
			return nil, errors.New("local research embeddings are disabled in production")
		}
		return NewHashEmbedder(DefaultEmbeddingDimensions), nil
	case "openai":
		if !cfg.ExternalCallsEnabled {
			return nil, errors.New("OpenAI research embeddings require AI_EXTERNAL_CALLS_ENABLED=true")
		}
		if strings.TrimSpace(cfg.OpenAIAPIKey) == "" {
			return nil, errors.New("OPENAI_API_KEY is required for OpenAI research embeddings")
		}
		model := strings.TrimSpace(cfg.Model)
		if model == "" {
			model = "text-embedding-3-small"
		}
		client := cfg.HTTPClient
		if client == nil {
			client = &http.Client{Timeout: 30 * time.Second}
		}
		return &OpenAIEmbedder{
			apiKey: cfg.OpenAIAPIKey, model: model, dimensions: DefaultEmbeddingDimensions,
			client: client, endpoint: "https://api.openai.com/v1/embeddings",
		}, nil
	default:
		return nil, fmt.Errorf("unsupported research embedding provider %q", cfg.Provider)
	}
}

func (e *OpenAIEmbedder) Descriptor() EmbeddingDescriptor {
	return EmbeddingDescriptor{
		Provider: "openai", Model: e.model, Version: "openai-embeddings-v1",
		Dimensions: e.dimensions, ExternalCalls: true,
	}
}

func (e *OpenAIEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return [][]float32{}, nil
	}
	if len(texts) > 64 {
		return nil, errors.New("embedding batch exceeds 64 texts")
	}
	payload, err := json.Marshal(map[string]any{
		"model": e.model, "input": texts, "dimensions": e.dimensions,
	})
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, e.endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+e.apiKey)
	request.Header.Set("Content-Type", "application/json")
	response, err := e.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("OpenAI embedding request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
		return nil, fmt.Errorf("OpenAI embedding request returned status %d", response.StatusCode)
	}
	var decoded struct {
		Data []struct {
			Index     int       `json:"index"`
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 16<<20)).Decode(&decoded); err != nil {
		return nil, fmt.Errorf("decode OpenAI embedding response: %w", err)
	}
	if len(decoded.Data) != len(texts) {
		return nil, errors.New("OpenAI embedding response count did not match request")
	}
	result := make([][]float32, len(texts))
	for _, item := range decoded.Data {
		if item.Index < 0 || item.Index >= len(result) || len(item.Embedding) != e.dimensions {
			return nil, errors.New("OpenAI embedding response had invalid dimensions or index")
		}
		result[item.Index] = item.Embedding
	}
	return result, nil
}

func embeddingTokens(value string) []string {
	return strings.FieldsFunc(strings.ToLower(value), func(current rune) bool {
		return !unicode.IsLetter(current) && !unicode.IsDigit(current)
	})
}

func addHashedFeature(vector []float32, feature string, weight float32) {
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(feature))
	sum := hasher.Sum64()
	index := int(sum % uint64(len(vector)))
	sign := float32(1)
	var raw [8]byte
	binary.LittleEndian.PutUint64(raw[:], sum)
	if raw[7]&1 == 1 {
		sign = -1
	}
	vector[index] += sign * weight
}

func normalizeVector(vector []float32) {
	var squared float64
	for _, value := range vector {
		squared += float64(value * value)
	}
	if squared == 0 {
		return
	}
	scale := float32(1 / math.Sqrt(squared))
	for index := range vector {
		vector[index] *= scale
	}
}
