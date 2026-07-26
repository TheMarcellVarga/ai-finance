package research

import (
	"reflect"
	"strings"
	"testing"
)

func TestPageWindowChunkerIsDeterministicAndPageAware(t *testing.T) {
	chunker := &PageWindowChunker{TargetCharacters: 50, MaximumCharacters: 70, OverlapCharacters: 25}
	document := Document{ID: "11111111-1111-4111-8111-111111111111", WorkspaceID: "22222222-2222-4222-8222-222222222222"}
	pages := []Page{
		{PageNumber: 1, NormalizedText: "Revenue increased during the year. Operating costs also increased. Cash flow remained positive."},
		{PageNumber: 2, NormalizedText: "Risk factors include supplier concentration. Management monitors this exposure."},
	}

	first, err := chunker.Chunk(document, pages)
	if err != nil {
		t.Fatal(err)
	}
	second, err := chunker.Chunk(document, pages)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(first, second) {
		t.Fatal("unchanged pages must produce identical chunk identities and metadata")
	}
	if len(first) < 3 {
		t.Fatalf("expected multiple page-local chunks, got %d", len(first))
	}
	for _, chunk := range first {
		if chunk.ID == "" || len(chunk.StableKey) != 64 || len(chunk.ContentSHA256) != 64 {
			t.Fatalf("missing stable identity: %#v", chunk)
		}
		if chunk.CharacterEnd <= chunk.CharacterStart {
			t.Fatalf("invalid character range: %#v", chunk)
		}
		if chunk.SourceLocator != "page:1" && chunk.SourceLocator != "page:2" {
			t.Fatalf("invalid source locator: %s", chunk.SourceLocator)
		}
	}
}

func TestPageWindowChunkerUsesSentenceAlignedOverlap(t *testing.T) {
	chunker := &PageWindowChunker{TargetCharacters: 45, MaximumCharacters: 65, OverlapCharacters: 30}
	document := Document{ID: "11111111-1111-4111-8111-111111111111", WorkspaceID: "22222222-2222-4222-8222-222222222222"}
	page := Page{PageNumber: 1, NormalizedText: "First evidence sentence. Shared context sentence. Final evidence sentence."}

	chunks, err := chunker.Chunk(document, []Page{page})
	if err != nil {
		t.Fatal(err)
	}
	if len(chunks) != 2 {
		t.Fatalf("expected two chunks, got %#v", chunks)
	}
	if !strings.Contains(chunks[0].ChunkText, "Shared context sentence.") ||
		!strings.HasPrefix(chunks[1].ChunkText, "Shared context sentence.") {
		t.Fatalf("expected sentence-aligned overlap, got %#v", chunks)
	}
}

func TestPageWindowChunkerSplitsOversizedSentenceOnWords(t *testing.T) {
	chunker := &PageWindowChunker{TargetCharacters: 30, MaximumCharacters: 40, OverlapCharacters: 10}
	document := Document{ID: "11111111-1111-4111-8111-111111111111", WorkspaceID: "22222222-2222-4222-8222-222222222222"}
	page := Page{PageNumber: 1, NormalizedText: strings.Repeat("material risk ", 12)}

	chunks, err := chunker.Chunk(document, []Page{page})
	if err != nil {
		t.Fatal(err)
	}
	if len(chunks) < 3 {
		t.Fatalf("expected oversized content to split, got %d chunks", len(chunks))
	}
	for _, chunk := range chunks {
		if len([]rune(chunk.ChunkText)) > 40 {
			t.Fatalf("chunk exceeded hard limit: %q", chunk.ChunkText)
		}
	}
}
