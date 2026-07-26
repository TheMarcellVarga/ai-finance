package research

import (
	"context"
	"errors"
	"io"
	"time"
)

const (
	MaxUploadBytes       = 10 << 20
	MaxPages             = 750
	MaxCharactersPerPage = 250_000
)

var (
	ErrNotFound           = errors.New("research resource not found")
	ErrConflict           = errors.New("research resource conflict")
	ErrInvalidUpload      = errors.New("invalid document upload")
	ErrPersistenceMissing = errors.New("research persistence is not configured")
)

type Workspace struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Document struct {
	ID               string     `json:"id"`
	WorkspaceID      string     `json:"workspaceId"`
	Title            string     `json:"title"`
	OriginalFilename string     `json:"originalFilename"`
	MimeType         string     `json:"mimeType"`
	ByteSize         int64      `json:"byteSize"`
	SHA256           string     `json:"sha256"`
	StorageBucket    string     `json:"-"`
	StorageObjectKey string     `json:"-"`
	Status           string     `json:"status"`
	AttemptCount     int        `json:"attemptCount"`
	ErrorCode        string     `json:"errorCode,omitempty"`
	ErrorMessage     string     `json:"errorMessage,omitempty"`
	PageCount        int        `json:"pageCount"`
	UploadedAt       *time.Time `json:"uploadedAt,omitempty"`
	ParsedAt         *time.Time `json:"parsedAt,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

type Page struct {
	ID             string         `json:"id"`
	DocumentID     string         `json:"documentId"`
	WorkspaceID    string         `json:"workspaceId"`
	PageNumber     int            `json:"pageNumber"`
	NormalizedText string         `json:"normalizedText"`
	TextSHA256     string         `json:"textSha256"`
	CharacterCount int            `json:"characterCount"`
	SourceMetadata map[string]any `json:"sourceMetadata"`
}

type Chunk struct {
	ID                  string    `json:"id"`
	DocumentID          string    `json:"documentId"`
	WorkspaceID         string    `json:"workspaceId"`
	PageNumber          int       `json:"pageNumber"`
	Sequence            int       `json:"sequence"`
	ChunkText           string    `json:"chunkText"`
	SourceLocator       string    `json:"sourceLocator"`
	SectionLabel        string    `json:"sectionLabel,omitempty"`
	HeadingPath         []string  `json:"headingPath"`
	CharacterStart      int       `json:"characterStart"`
	CharacterEnd        int       `json:"characterEnd"`
	StableKey           string    `json:"stableKey"`
	ContentSHA256       string    `json:"contentSha256"`
	ChunkerVersion      string    `json:"chunkerVersion"`
	Embedding           []float32 `json:"-"`
	EmbeddingStatus     string    `json:"embeddingStatus"`
	EmbeddingProvider   string    `json:"embeddingProvider"`
	EmbeddingModel      string    `json:"embeddingModel"`
	EmbeddingVersion    string    `json:"embeddingVersion"`
	EmbeddingDimensions int       `json:"embeddingDimensions"`
}

type SearchRequest struct {
	Query       string   `json:"query"`
	Limit       int      `json:"limit,omitempty"`
	DocumentIDs []string `json:"documentIds,omitempty"`
}

type EvidenceResult struct {
	ChunkID           string   `json:"chunkId"`
	DocumentID        string   `json:"documentId"`
	DocumentTitle     string   `json:"documentTitle"`
	PageNumber        int      `json:"pageNumber"`
	Sequence          int      `json:"sequence"`
	Snippet           string   `json:"snippet"`
	SourceLocator     string   `json:"sourceLocator"`
	SectionLabel      string   `json:"sectionLabel,omitempty"`
	HeadingPath       []string `json:"headingPath"`
	ChunkerVersion    string   `json:"chunkerVersion"`
	EmbeddingProvider string   `json:"embeddingProvider"`
	EmbeddingModel    string   `json:"embeddingModel"`
	EmbeddingVersion  string   `json:"embeddingVersion"`
	VectorSimilarity  float64  `json:"vectorSimilarity"`
	LexicalScore      float64  `json:"lexicalScore"`
	CombinedScore     float64  `json:"combinedScore"`
	ContentSHA256     string   `json:"-"`
}

type RetrievalFilters struct {
	WorkspaceID string   `json:"workspaceId"`
	DocumentIDs []string `json:"documentIds"`
}

type RetrievalDiagnostics struct {
	RunID                string              `json:"runId"`
	QuerySHA256          string              `json:"querySha256"`
	Filters              RetrievalFilters    `json:"filters"`
	ChunkerVersion       string              `json:"chunkerVersion"`
	Embedding            EmbeddingDescriptor `json:"embedding"`
	RequestedLimit       int                 `json:"requestedLimit"`
	CandidateCount       int                 `json:"candidateCount"`
	ResultCount          int                 `json:"resultCount"`
	DuplicatesSuppressed int                 `json:"duplicatesSuppressed"`
	StageTimings         map[string]int64    `json:"stageTimingsMs"`
}

type SearchResponse struct {
	Results     []EvidenceResult     `json:"results"`
	Diagnostics RetrievalDiagnostics `json:"diagnostics"`
}

type RetrievalRun struct {
	ID             string
	WorkspaceID    string
	QuerySHA256    string
	DocumentIDs    []string
	RequestedLimit int
	CandidateCount int
	ResultChunkIDs []string
	ChunkerVersion string
	Embedding      EmbeddingDescriptor
	Filters        RetrievalFilters
	StageTimings   map[string]int64
}

type ProcessingJob struct {
	ID          string
	Document    Document
	Attempts    int
	MaxAttempts int
}

type UploadMetadata struct {
	ID               string
	Title            string
	OriginalFilename string
	MimeType         string
	ByteSize         int64
	SHA256           string
	Extension        string
}

type Store interface {
	PersistenceMode() string
	ListWorkspaces(context.Context, string) ([]Workspace, error)
	CreateWorkspace(context.Context, string, string, string) (Workspace, error)
	GetWorkspace(context.Context, string, string) (Workspace, error)
	ListDocuments(context.Context, string, string) ([]Document, error)
	GetDocument(context.Context, string, string, string) (Document, error)
	CreatePendingDocument(context.Context, string, string, UploadMetadata) (Document, error)
	FinalizeUpload(context.Context, string, string, string) (Document, error)
	FailUpload(context.Context, string, string, string, string) error
	RetryDocument(context.Context, string, string, string) (Document, error)
	ListPages(context.Context, string, string, string) ([]Page, error)
	SearchEvidenceCandidates(context.Context, string, string, SearchRequest, []float32, EmbeddingDescriptor, int) ([]EvidenceResult, error)
	RecordRetrievalRun(context.Context, string, RetrievalRun) error
	ClaimProcessingJob(context.Context, string, time.Duration) (ProcessingJob, bool, error)
	CompleteProcessingJob(context.Context, string, []Page, []Chunk, map[string]int64) (Document, error)
	FailProcessingJob(context.Context, string, string, string, bool) error
}

type ObjectStorage interface {
	Mode() string
	Put(context.Context, string, string, io.Reader, int64) error
	Open(context.Context, string) (io.ReadCloser, error)
	Delete(context.Context, string) error
}

type DocumentParser interface {
	Parse(context.Context, io.Reader, string) ([]Page, error)
}

type DocumentChunker interface {
	Version() string
	Chunk(Document, []Page) ([]Chunk, error)
}
