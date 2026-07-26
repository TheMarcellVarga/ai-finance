package research

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"
	"unicode"
)

const (
	DefaultSearchLimit  = 8
	MaxSearchLimit      = 20
	MaxSearchQueryRunes = 500
	MaxDocumentFilters  = 20
)

type Retriever struct {
	Store    Store
	Embedder Embedder
}

func (r Retriever) Search(ctx context.Context, userID, workspaceID string, request SearchRequest) (SearchResponse, error) {
	if r.Store == nil || r.Embedder == nil {
		return SearchResponse{}, errors.New("research retrieval is not configured")
	}
	normalized, err := normalizeSearchRequest(workspaceID, request)
	if err != nil {
		return SearchResponse{}, err
	}
	startedAt := time.Now()
	vectors, err := r.Embedder.Embed(ctx, []string{normalized.Query})
	if err != nil || len(vectors) != 1 {
		if err == nil {
			err = errors.New("query embedding response was invalid")
		}
		return SearchResponse{}, err
	}
	embedCompletedAt := time.Now()
	descriptor := r.Embedder.Descriptor()
	if len(vectors[0]) != descriptor.Dimensions {
		return SearchResponse{}, errors.New("query embedding dimensions did not match the configured index")
	}
	candidateLimit := min(normalized.Limit*5, 100)
	candidates, err := r.Store.SearchEvidenceCandidates(
		ctx, userID, workspaceID, normalized, vectors[0], descriptor, candidateLimit,
	)
	if err != nil {
		return SearchResponse{}, err
	}
	searchCompletedAt := time.Now()
	results, suppressed := suppressNearDuplicates(candidates, normalized.Limit)
	resultIDs := make([]string, len(results))
	for index := range results {
		resultIDs[index] = results[index].ChunkID
	}
	run := RetrievalRun{
		ID: NewID(), WorkspaceID: workspaceID, QuerySHA256: sha256Hex(normalized.Query),
		DocumentIDs: normalized.DocumentIDs, RequestedLimit: normalized.Limit,
		CandidateCount: len(candidates), ResultChunkIDs: resultIDs,
		ChunkerVersion: PageWindowChunkerVersion, Embedding: descriptor,
		Filters: RetrievalFilters{WorkspaceID: workspaceID, DocumentIDs: normalized.DocumentIDs},
		StageTimings: map[string]int64{
			"embed":  embedCompletedAt.Sub(startedAt).Milliseconds(),
			"search": searchCompletedAt.Sub(embedCompletedAt).Milliseconds(),
			"total":  time.Since(startedAt).Milliseconds(),
		},
	}
	if err := r.Store.RecordRetrievalRun(ctx, userID, run); err != nil {
		return SearchResponse{}, err
	}
	return SearchResponse{
		Results: results,
		Diagnostics: RetrievalDiagnostics{
			RunID: run.ID, QuerySHA256: run.QuerySHA256, Filters: run.Filters,
			ChunkerVersion: run.ChunkerVersion, Embedding: descriptor,
			RequestedLimit: run.RequestedLimit, CandidateCount: run.CandidateCount,
			ResultCount: len(results), DuplicatesSuppressed: suppressed,
			StageTimings: run.StageTimings,
		},
	}, nil
}

func normalizeSearchRequest(workspaceID string, request SearchRequest) (SearchRequest, error) {
	request.Query = normalizeChunkText(request.Query)
	queryLength := len([]rune(request.Query))
	if strings.TrimSpace(workspaceID) == "" {
		return SearchRequest{}, &ValidationError{Code: "workspace_required", Message: "A research workspace is required."}
	}
	if queryLength < 2 || queryLength > MaxSearchQueryRunes {
		return SearchRequest{}, &ValidationError{Code: "invalid_search_query", Message: "Search queries must contain between 2 and 500 characters."}
	}
	if request.Limit == 0 {
		request.Limit = DefaultSearchLimit
	}
	if request.Limit < 1 || request.Limit > MaxSearchLimit {
		return SearchRequest{}, &ValidationError{Code: "invalid_search_limit", Message: "Search result limits must be between 1 and 20."}
	}
	if len(request.DocumentIDs) > MaxDocumentFilters {
		return SearchRequest{}, &ValidationError{Code: "too_many_document_filters", Message: "Select no more than 20 documents."}
	}
	unique := make(map[string]struct{}, len(request.DocumentIDs))
	filtered := make([]string, 0, len(request.DocumentIDs))
	for _, documentID := range request.DocumentIDs {
		documentID = strings.TrimSpace(documentID)
		if !looksLikeUUID(documentID) {
			return SearchRequest{}, &ValidationError{Code: "invalid_document_filter", Message: "A selected document was invalid."}
		}
		if _, exists := unique[documentID]; exists {
			continue
		}
		unique[documentID] = struct{}{}
		filtered = append(filtered, documentID)
	}
	sort.Strings(filtered)
	request.DocumentIDs = filtered
	return request, nil
}

func suppressNearDuplicates(candidates []EvidenceResult, limit int) ([]EvidenceResult, int) {
	result := make([]EvidenceResult, 0, min(limit, len(candidates)))
	fingerprints := make([]map[string]struct{}, 0, limit)
	contentHashes := make(map[string]struct{}, limit)
	suppressed := 0
	for _, candidate := range candidates {
		if _, exists := contentHashes[candidate.ContentSHA256]; candidate.ContentSHA256 != "" && exists {
			suppressed++
			continue
		}
		fingerprint := tokenShingles(candidate.Snippet, 3)
		duplicate := false
		for _, existing := range fingerprints {
			if jaccardSimilarity(existing, fingerprint) >= 0.88 {
				duplicate = true
				break
			}
		}
		if duplicate {
			suppressed++
			continue
		}
		result = append(result, candidate)
		fingerprints = append(fingerprints, fingerprint)
		if candidate.ContentSHA256 != "" {
			contentHashes[candidate.ContentSHA256] = struct{}{}
		}
		if len(result) == limit {
			break
		}
	}
	return result, suppressed
}

func tokenShingles(value string, size int) map[string]struct{} {
	tokens := strings.FieldsFunc(strings.ToLower(value), func(current rune) bool {
		return !unicode.IsLetter(current) && !unicode.IsDigit(current)
	})
	result := make(map[string]struct{})
	if len(tokens) < size {
		if len(tokens) > 0 {
			result[strings.Join(tokens, " ")] = struct{}{}
		}
		return result
	}
	for index := 0; index+size <= len(tokens); index++ {
		result[strings.Join(tokens[index:index+size], " ")] = struct{}{}
	}
	return result
}

func jaccardSimilarity(left, right map[string]struct{}) float64 {
	if len(left) == 0 || len(right) == 0 {
		return 0
	}
	intersection := 0
	for value := range left {
		if _, exists := right[value]; exists {
			intersection++
		}
	}
	union := len(left) + len(right) - intersection
	return float64(intersection) / float64(union)
}

func looksLikeUUID(value string) bool {
	if len(value) != 36 {
		return false
	}
	for index, current := range value {
		if index == 8 || index == 13 || index == 18 || index == 23 {
			if current != '-' {
				return false
			}
			continue
		}
		if !((current >= '0' && current <= '9') || (current >= 'a' && current <= 'f') || (current >= 'A' && current <= 'F')) {
			return false
		}
	}
	return true
}
