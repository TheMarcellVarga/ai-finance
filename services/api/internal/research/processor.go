package research

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
)

type Processor struct {
	Store   Store
	Storage ObjectStorage
	Parser  DocumentParser
	Logger  *slog.Logger
}

func (p *Processor) ProcessNext(ctx context.Context, workerID string) (bool, error) {
	if p.Store == nil || p.Storage == nil || p.Parser == nil {
		return false, errors.New("research processor is not fully configured")
	}
	if p.Logger == nil {
		p.Logger = slog.Default()
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

	timings := map[string]int64{"parseMs": time.Since(startedAt).Milliseconds()}
	if _, err := p.Store.CompleteProcessingJob(ctx, job.ID, pages, timings); err != nil {
		return true, err
	}
	p.Logger.Info("document processing completed", "documentId", job.Document.ID, "pageCount", len(pages), "parseMs", timings["parseMs"])
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
