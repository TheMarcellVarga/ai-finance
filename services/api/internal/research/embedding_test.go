package research

import (
	"context"
	"math"
	"reflect"
	"testing"
)

func TestHashEmbedderIsDeterministicAndNormalized(t *testing.T) {
	embedder := NewHashEmbedder(DefaultEmbeddingDimensions)
	first, err := embedder.Embed(context.Background(), []string{"Revenue grew while operating costs declined."})
	if err != nil {
		t.Fatal(err)
	}
	second, err := embedder.Embed(context.Background(), []string{"Revenue grew while operating costs declined."})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(first, second) {
		t.Fatal("local embeddings must be deterministic")
	}
	if len(first) != 1 || len(first[0]) != DefaultEmbeddingDimensions {
		t.Fatalf("unexpected embedding dimensions: %d", len(first[0]))
	}
	var squared float64
	for _, value := range first[0] {
		squared += float64(value * value)
	}
	if math.Abs(math.Sqrt(squared)-1) > 0.0001 {
		t.Fatalf("expected normalized vector, got norm %f", math.Sqrt(squared))
	}
	if embedder.Descriptor().ExternalCalls {
		t.Fatal("local embedder must never report external calls")
	}
}

func TestNewEmbedderKeepsExternalCallsDisabledByDefault(t *testing.T) {
	if _, err := NewEmbedder(EmbedderConfig{Provider: "openai", OpenAIAPIKey: "not-used"}); err == nil {
		t.Fatal("expected OpenAI provider to require the external-call kill switch")
	}
	if _, err := NewEmbedder(EmbedderConfig{
		Provider: "openai", ExternalCallsEnabled: true,
	}); err == nil {
		t.Fatal("expected OpenAI provider to require a server-side API key")
	}
	if _, err := NewEmbedder(EmbedderConfig{
		Provider: "local", Production: true,
	}); err == nil {
		t.Fatal("expected production to reject local embeddings without an explicit override")
	}
}

func TestHashEmbedderRewardsSharedTerms(t *testing.T) {
	embedder := NewHashEmbedder(DefaultEmbeddingDimensions)
	vectors, err := embedder.Embed(context.Background(), []string{
		"supplier concentration risk",
		"supplier concentration exposure",
		"dividend payment schedule",
	})
	if err != nil {
		t.Fatal(err)
	}
	if cosine(vectors[0], vectors[1]) <= cosine(vectors[0], vectors[2]) {
		t.Fatal("shared finance terms should have stronger local similarity")
	}
}

func cosine(left, right []float32) float64 {
	var result float64
	for index := range left {
		result += float64(left[index] * right[index])
	}
	return result
}
