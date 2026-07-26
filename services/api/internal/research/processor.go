package research

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
)

type Processor struct {
	Store    Store
	Storage  ObjectStorage
	Parser   DocumentParser
	Chunker  DocumentChunker
	Embedder Embedder
	Logger   *slog.Logger
}

func (p *Processor) ProcessNext(ctx context.Context, workerID string) (bool, error) {
	if p.Store == nil || p.Storage == nil || p.Parser == nil {
		return false, errors.New("research processor is not fully configured")
	}
	if p.Logger == nil {
		p.Logger = slog.Default()
	}
	if p.Chunker == nil {
		p.Chunker = NewPageWindowChunker()
	}
	if p.Embedder == nil {
		p.Embedder = NewHashEmbedder(DefaultEmbeddingDimensions)
	}
	job, ok, err := p.Store.ClaimProcessingJob(ctx, cleanText(workerID, "worker", 120), 2*time.Minute)
	if err != nil || !ok {
		return ok, err
	}

	startedAt := time.Now()
	object, err := p.Storage.Open(ctx, job.Document.StorageObjectKey)
	if err != nil {
		_ = p.Store.FailProcessingJob(ctx, job.ID, "storage_read_failed", "The stored document could not be opened.", true)
		p.Logger.Warn("document processing storage read failed", "documentId", job.Document.ID, "errorType", "storage_read_failed")
		return true, nil
	}
	pages, parseErr := p.Parser.Parse(ctx, object, job.Document.MimeType)
	closeErr := object.Close()
	if parseErr == nil && closeErr != nil {
		parseErr = &ParseError{Code: "storage_read_failed", Message: "The stored document could not be read completely.", Retryable: true}
	}
	if parseErr != nil {
		code, message, retryable := safeParseFailure(parseErr)
		_ = p.Store.FailProcessingJob(ctx, job.ID, code, message, retryable)
		p.Logger.Warn("document processing failed", "documentId", job.Document.ID, "errorType", code)
		return true, nil
	}
	for index := range pages {
		pages[index].ID = NewID()
		pages[index].DocumentID = job.Document.ID
		pages[index].WorkspaceID = job.Document.WorkspaceID
		if pages[index].SourceMetadata == nil {
			pages[index].SourceMetadata = map[string]any{}
		}
		pages[index].SourceMetadata["documentId"] = job.Document.ID
		pages[index].SourceMetadata["workspaceId"] = job.Document.WorkspaceID
		pages[index].SourceMetadata["pageNumber"] = pages[index].PageNumber
	}

	parseCompletedAt := time.Now()
	chunks, err := p.Chunker.Chunk(job.Document, pages)
	if err != nil {
		_ = p.Store.FailProcessingJob(ctx, job.ID, "chunking_failed", "The document could not be indexed.", false)
		p.Logger.Warn("document chunking failed", "documentId", job.Document.ID, "errorType", "chunking_failed")
		return true, nil
	}
	chunkCompletedAt := time.Now()
	texts := make([]string, len(chunks))
	for index := range chunks {
		texts[index] = chunks[index].ChunkText
	}
	embeddings, err := p.Embedder.Embed(ctx, texts)
	if err != nil || len(embeddings) != len(chunks) {
		_ = p.Store.FailProcessingJob(ctx, job.ID, "embedding_failed", "The document could not be indexed.", true)
		p.Logger.Warn("document embedding failed", "documentId", job.Document.ID, "errorType", "embedding_failed")
		return true, nil
	}
	descriptor := p.Embedder.Descriptor()
	for index := range chunks {
		if len(embeddings[index]) != descriptor.Dimensions {
			_ = p.Store.FailProcessingJob(ctx, job.ID, "embedding_invalid", "The document could not be indexed.", false)
			p.Logger.Warn("document embedding dimensions invalid", "documentId", job.Document.ID, "errorType", "embedding_invalid")
			return true, nil
		}
		chunks[index].Embedding = embeddings[index]
		chunks[index].EmbeddingStatus = "ready"
		chunks[index].EmbeddingProvider = descriptor.Provider
		chunks[index].EmbeddingModel = descriptor.Model
		chunks[index].EmbeddingVersion = descriptor.Version
		chunks[index].EmbeddingDimensions = descriptor.Dimensions
	}
	embeddingCompletedAt := time.Now()
	timings := map[string]int64{
		"parseMs": parseCompletedAt.Sub(startedAt).Milliseconds(),
		"chunkMs": chunkCompletedAt.Sub(parseCompletedAt).Milliseconds(),
		"embedMs": embeddingCompletedAt.Sub(chunkCompletedAt).Milliseconds(),
		"totalMs": embeddingCompletedAt.Sub(startedAt).Milliseconds(),
	}
	if _, err := p.Store.CompleteProcessingJob(ctx, job.ID, pages, chunks, timings); err != nil {
		return true, err
	}
	p.Logger.Info(
		"document processing completed",
		"documentId", job.Document.ID,
		"pageCount", len(pages),
		"chunkCount", len(chunks),
		"embeddingProvider", descriptor.Provider,
		"embeddingModel", descriptor.Model,
		"totalMs", timings["totalMs"],
	)
	return true, nil
}

func safeParseFailure(err error) (string, string, bool) {
	var parseError *ParseError
	if errors.As(err, &parseError) {
		return cleanText(parseError.Code, "processing_failed", 80), cleanText(parseError.Message, "The document could not be processed.", 500), parseError.Retryable
	}
	message := "The document could not be processed."
	if strings.Contains(strings.ToLower(err.Error()), "timeout") {
		message = "Document processing timed out."
	}
	return "processing_failed", message, false
}
