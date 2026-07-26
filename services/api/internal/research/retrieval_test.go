package research

import "testing"

func TestSuppressNearDuplicatesKeepsDistinctEvidence(t *testing.T) {
	candidates := []EvidenceResult{
		{ChunkID: "a", Snippet: "Supplier concentration creates a material operational risk for the company.", ContentSHA256: "exact"},
		{ChunkID: "b", Snippet: "Supplier concentration creates a material operational risk for the company.", ContentSHA256: "exact"},
		{ChunkID: "c", Snippet: "Supplier concentration creates a material operational risk for the company today.", ContentSHA256: "near"},
		{ChunkID: "d", Snippet: "Liquidity remained sufficient throughout the reporting period.", ContentSHA256: "distinct"},
	}
	results, suppressed := suppressNearDuplicates(candidates, 4)
	if len(results) != 2 || suppressed != 2 {
		t.Fatalf("expected duplicate suppression with distinct evidence retained, results=%#v suppressed=%d", results, suppressed)
	}
	if results[0].ChunkID != "a" || results[1].ChunkID != "d" {
		t.Fatalf("unexpected retained evidence: %#v", results)
	}
}

func TestNormalizeSearchRequestValidatesAndSortsFilters(t *testing.T) {
	request, err := normalizeSearchRequest("workspace", SearchRequest{
		Query: "  supplier   risk ",
		DocumentIDs: []string{
			"22222222-2222-4222-8222-222222222222",
			"11111111-1111-4111-8111-111111111111",
			"22222222-2222-4222-8222-222222222222",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if request.Query != "supplier risk" || request.Limit != DefaultSearchLimit || len(request.DocumentIDs) != 2 ||
		request.DocumentIDs[0] != "11111111-1111-4111-8111-111111111111" {
		t.Fatalf("unexpected normalized search request: %#v", request)
	}
}
