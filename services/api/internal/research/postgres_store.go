package research

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcellvarga/ai-finance/services/api/internal/db/dbqueries"
	"github.com/pgvector/pgvector-go"
)

const researchBucket = "research-documents"

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

func (s *PostgresStore) PersistenceMode() string {
	return "postgres"
}

func (s *PostgresStore) ListWorkspaces(ctx context.Context, userID string) ([]Workspace, error) {
	var result []Workspace
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		rows, err := q.ListResearchWorkspaces(ctx, profileID)
		if err != nil {
			return err
		}
		result = make([]Workspace, 0, len(rows))
		for _, row := range rows {
			result = append(result, workspaceFromValues(
				row.ID, row.Name, row.Description, row.Status, row.CreatedAt, row.UpdatedAt,
			))
		}
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) CreateWorkspace(ctx context.Context, userID, name, description string) (Workspace, error) {
	var result Workspace
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		row, err := q.CreateResearchWorkspace(ctx, dbqueries.CreateResearchWorkspaceParams{
			ID:          uuidValue(NewID()),
			UserID:      profileID,
			Name:        cleanText(name, "Primary research workspace", 120),
			Description: cleanText(description, "", 1000),
		})
		if err != nil {
			return err
		}
		result = workspaceFromValues(row.ID, row.Name, row.Description, row.Status, row.CreatedAt, row.UpdatedAt)
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) GetWorkspace(ctx context.Context, userID, workspaceID string) (Workspace, error) {
	var result Workspace
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		row, err := q.GetResearchWorkspace(ctx, dbqueries.GetResearchWorkspaceParams{
			ID: uuidValue(workspaceID), UserID: profileID,
		})
		if err != nil {
			return err
		}
		result = workspaceFromValues(row.ID, row.Name, row.Description, row.Status, row.CreatedAt, row.UpdatedAt)
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) ListDocuments(ctx context.Context, userID, workspaceID string) ([]Document, error) {
	var result []Document
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		if _, err := q.GetResearchWorkspace(ctx, dbqueries.GetResearchWorkspaceParams{
			ID: uuidValue(workspaceID), UserID: profileID,
		}); err != nil {
			return err
		}
		rows, err := q.ListResearchDocuments(ctx, dbqueries.ListResearchDocumentsParams{
			WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		})
		if err != nil {
			return err
		}
		result = make([]Document, 0, len(rows))
		for _, row := range rows {
			result = append(result, documentFromValues(
				row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
				row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
				row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
				row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
			))
		}
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) GetDocument(ctx context.Context, userID, workspaceID, documentID string) (Document, error) {
	var result Document
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		row, err := q.GetResearchDocument(ctx, dbqueries.GetResearchDocumentParams{
			ID: uuidValue(documentID), WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		})
		if err != nil {
			return err
		}
		result = documentFromValues(
			row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
			row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
			row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
			row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
		)
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) CreatePendingDocument(ctx context.Context, userID, workspaceID string, upload UploadMetadata) (Document, error) {
	var result Document
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		objectKey := ObjectKey(uuidString(profileID), workspaceID, upload.ID, upload.Extension)
		row, err := q.CreateResearchDocument(ctx, dbqueries.CreateResearchDocumentParams{
			ID:               uuidValue(upload.ID),
			WorkspaceID:      uuidValue(workspaceID),
			UploadedBy:       profileID,
			Title:            cleanText(upload.Title, upload.OriginalFilename, 200),
			OriginalFilename: textValue(cleanText(upload.OriginalFilename, "document"+upload.Extension, 255)),
			MimeType:         textValue(upload.MimeType),
			ByteSize:         pgtype.Int8{Int64: upload.ByteSize, Valid: true},
			Sha256:           textValue(upload.SHA256),
			StorageBucket:    textValue(researchBucket),
			StorageObjectKey: textValue(objectKey),
		})
		if err != nil {
			return err
		}
		result = documentFromValues(
			row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
			row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
			row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
			row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
		)
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) FinalizeUpload(ctx context.Context, userID, workspaceID, documentID string) (Document, error) {
	var result Document
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		row, err := q.FinalizeResearchDocumentUpload(ctx, dbqueries.FinalizeResearchDocumentUploadParams{
			ID: uuidValue(documentID), WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		})
		if err != nil {
			return err
		}
		_, err = q.QueueDocumentProcessingJob(ctx, dbqueries.QueueDocumentProcessingJobParams{
			ID:             uuidValue(NewID()),
			DocumentID:     uuidValue(documentID),
			WorkspaceID:    uuidValue(workspaceID),
			IdempotencyKey: documentID + ":parse:" + NewID(),
		})
		if err != nil {
			return err
		}
		result = documentFromValues(
			row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
			row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
			row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
			row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
		)
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) FailUpload(ctx context.Context, userID, workspaceID, documentID, code string) error {
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		count, err := q.MarkResearchDocumentUploadFailed(ctx, dbqueries.MarkResearchDocumentUploadFailedParams{
			ErrorCode: textValue(cleanText(code, "storage_failure", 80)),
			ID:        uuidValue(documentID), WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		})
		if err == nil && count == 0 {
			return pgx.ErrNoRows
		}
		return err
	})
	return mapStoreError(err)
}

func (s *PostgresStore) RetryDocument(ctx context.Context, userID, workspaceID, documentID string) (Document, error) {
	var result Document
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		documentUUID := uuidValue(documentID)
		count, err := q.ActiveDocumentProcessingJobCount(ctx, documentUUID)
		if err != nil {
			return err
		}
		if count > 0 {
			return ErrConflict
		}
		row, err := q.RetryResearchDocument(ctx, dbqueries.RetryResearchDocumentParams{
			ID: documentUUID, WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		})
		if err != nil {
			return err
		}
		_, err = q.QueueDocumentProcessingJob(ctx, dbqueries.QueueDocumentProcessingJobParams{
			ID:             uuidValue(NewID()),
			DocumentID:     documentUUID,
			WorkspaceID:    uuidValue(workspaceID),
			IdempotencyKey: documentID + ":retry:" + NewID(),
		})
		if err != nil {
			return err
		}
		result = documentFromValues(
			row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
			row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
			row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
			row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
		)
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) ListPages(ctx context.Context, userID, workspaceID, documentID string) ([]Page, error) {
	var result []Page
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		if _, err := q.GetResearchDocument(ctx, dbqueries.GetResearchDocumentParams{
			ID: uuidValue(documentID), WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		}); err != nil {
			return err
		}
		rows, err := q.ListResearchDocumentPages(ctx, dbqueries.ListResearchDocumentPagesParams{
			DocumentID: uuidValue(documentID), WorkspaceID: uuidValue(workspaceID), UserID: profileID,
		})
		if err != nil {
			return err
		}
		result = make([]Page, 0, len(rows))
		for _, row := range rows {
			metadata := map[string]any{}
			if len(row.SourceMetadata) > 0 {
				_ = json.Unmarshal(row.SourceMetadata, &metadata)
			}
			result = append(result, Page{
				ID: uuidString(row.ID), DocumentID: uuidString(row.DocumentID),
				WorkspaceID: uuidString(row.WorkspaceID), PageNumber: int(row.PageNumber),
				NormalizedText: row.NormalizedText, TextSHA256: row.TextSha256,
				CharacterCount: int(row.CharacterCount), SourceMetadata: metadata,
			})
		}
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) SearchEvidenceCandidates(
	ctx context.Context,
	userID, workspaceID string,
	request SearchRequest,
	queryEmbedding []float32,
	descriptor EmbeddingDescriptor,
	candidateLimit int,
) ([]EvidenceResult, error) {
	var result []EvidenceResult
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		workspaceUUID := uuidValue(workspaceID)
		if _, err := q.GetResearchWorkspace(ctx, dbqueries.GetResearchWorkspaceParams{
			ID: workspaceUUID, UserID: profileID,
		}); err != nil {
			return err
		}
		documentIDs := uuidValues(request.DocumentIDs)
		if len(documentIDs) > 0 {
			count, err := q.CountOwnedResearchDocumentFilters(ctx, dbqueries.CountOwnedResearchDocumentFiltersParams{
				WorkspaceID: workspaceUUID, UserID: profileID, DocumentIds: documentIDs,
			})
			if err != nil {
				return err
			}
			if count != int64(len(documentIDs)) {
				return pgx.ErrNoRows
			}
		}
		rows, err := q.SearchResearchEvidenceCandidates(ctx, dbqueries.SearchResearchEvidenceCandidatesParams{
			CandidateLimit: int32(candidateLimit),
			QueryEmbedding: pgvector.NewVector(queryEmbedding),
			WorkspaceID:    workspaceUUID, UserID: profileID,
			EmbeddingProvider:   textValue(descriptor.Provider),
			EmbeddingModel:      textValue(descriptor.Model),
			EmbeddingVersion:    textValue(descriptor.Version),
			EmbeddingDimensions: pgtype.Int4{Int32: int32(descriptor.Dimensions), Valid: true},
			DocumentIds:         documentIDs, SearchQuery: request.Query,
		})
		if err != nil {
			return err
		}
		result = make([]EvidenceResult, 0, len(rows))
		for _, row := range rows {
			result = append(result, EvidenceResult{
				ChunkID: uuidString(row.ID), DocumentID: uuidString(row.DocumentID),
				DocumentTitle: row.DocumentTitle, PageNumber: int(row.PageNumber.Int32),
				Sequence: int(row.Sequence.Int32), Snippet: row.ChunkText,
				SourceLocator: row.SourceLocator.String, SectionLabel: row.SectionLabel.String,
				HeadingPath: row.HeadingPath, ChunkerVersion: row.ChunkerVersion.String,
				EmbeddingProvider: row.EmbeddingProvider.String,
				EmbeddingModel:    row.EmbeddingModel.String,
				EmbeddingVersion:  row.EmbeddingVersion.String,
				VectorSimilarity:  row.VectorSimilarity, LexicalScore: row.LexicalScore,
				CombinedScore: row.CombinedScore, ContentSHA256: row.ContentSha256.String,
			})
		}
		return nil
	})
	return result, mapStoreError(err)
}

func (s *PostgresStore) RecordRetrievalRun(ctx context.Context, userID string, run RetrievalRun) error {
	err := s.withUserQueries(ctx, userID, func(q *dbqueries.Queries, profileID pgtype.UUID) error {
		filters, err := json.Marshal(run.Filters)
		if err != nil {
			return err
		}
		timings, err := json.Marshal(run.StageTimings)
		if err != nil {
			return err
		}
		return q.InsertResearchRetrievalRun(ctx, dbqueries.InsertResearchRetrievalRunParams{
			ID: uuidValue(run.ID), UserID: profileID, WorkspaceID: uuidValue(run.WorkspaceID),
			QuerySha256: run.QuerySHA256, SelectedDocumentIds: uuidValues(run.DocumentIDs),
			RequestedLimit: int32(run.RequestedLimit), CandidateCount: int32(run.CandidateCount),
			ReturnedCount: int32(len(run.ResultChunkIDs)), ResultChunkIds: uuidValues(run.ResultChunkIDs),
			ChunkerVersion: run.ChunkerVersion, EmbeddingProvider: run.Embedding.Provider,
			EmbeddingModel: run.Embedding.Model, EmbeddingVersion: run.Embedding.Version,
			EmbeddingDimensions: int32(run.Embedding.Dimensions),
			Filters:             filters, StageTimings: timings,
		})
	})
	return mapStoreError(err)
}

func (s *PostgresStore) ClaimProcessingJob(ctx context.Context, workerID string, lease time.Duration) (ProcessingJob, bool, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ProcessingJob{}, false, err
	}
	defer tx.Rollback(ctx)
	q := dbqueries.New(tx)
	row, err := q.ClaimDocumentProcessingJob(ctx, dbqueries.ClaimDocumentProcessingJobParams{
		LeaseOwner: textValue(workerID), LeaseSeconds: int32(max(1, int(lease.Seconds()))),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return ProcessingJob{}, false, nil
	}
	if err != nil {
		return ProcessingJob{}, false, err
	}
	if err := q.MarkResearchDocumentProcessing(ctx, row.ID); err != nil {
		return ProcessingJob{}, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return ProcessingJob{}, false, err
	}
	return ProcessingJob{
		ID: uuidString(row.JobID),
		Document: documentFromValues(
			row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
			row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
			row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
			row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
		),
		Attempts: int(row.Attempts), MaxAttempts: int(row.MaxAttempts),
	}, true, nil
}

func (s *PostgresStore) CompleteProcessingJob(ctx context.Context, jobID string, pages []Page, chunks []Chunk, timings map[string]int64) (Document, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Document{}, err
	}
	defer tx.Rollback(ctx)
	q := dbqueries.New(tx)
	job, err := q.GetDocumentProcessingJob(ctx, uuidValue(jobID))
	if err != nil {
		return Document{}, mapStoreError(err)
	}
	if err := q.DeleteResearchDocumentPages(ctx, job.DocumentID); err != nil {
		return Document{}, err
	}
	if err := q.DeleteResearchDocumentChunks(ctx, job.DocumentID); err != nil {
		return Document{}, err
	}
	for _, page := range pages {
		metadata, err := json.Marshal(page.SourceMetadata)
		if err != nil {
			return Document{}, err
		}
		if err := q.InsertResearchDocumentPage(ctx, dbqueries.InsertResearchDocumentPageParams{
			ID: uuidValue(page.ID), DocumentID: job.DocumentID, WorkspaceID: uuidValue(page.WorkspaceID),
			PageNumber: int32(page.PageNumber), NormalizedText: page.NormalizedText,
			TextSha256: page.TextSHA256, CharacterCount: int32(page.CharacterCount),
			SourceMetadata: metadata,
		}); err != nil {
			return Document{}, err
		}
	}
	for _, chunk := range chunks {
		if err := q.InsertResearchDocumentChunk(ctx, dbqueries.InsertResearchDocumentChunkParams{
			ID: uuidValue(chunk.ID), DocumentID: job.DocumentID,
			WorkspaceID: uuidValue(chunk.WorkspaceID),
			PageNumber:  pgtype.Int4{Int32: int32(chunk.PageNumber), Valid: true},
			Sequence:    pgtype.Int4{Int32: int32(chunk.Sequence), Valid: true},
			ChunkText:   chunk.ChunkText, SourceLocator: textValue(chunk.SourceLocator),
			SectionLabel: textValue(chunk.SectionLabel), HeadingPath: chunk.HeadingPath,
			CharacterStart: pgtype.Int4{Int32: int32(chunk.CharacterStart), Valid: true},
			CharacterEnd:   pgtype.Int4{Int32: int32(chunk.CharacterEnd), Valid: true},
			StableKey:      textValue(chunk.StableKey), ContentSha256: textValue(chunk.ContentSHA256),
			ChunkerVersion:    textValue(chunk.ChunkerVersion),
			Embedding:         pgvector.NewVector(chunk.Embedding),
			EmbeddingProvider: textValue(chunk.EmbeddingProvider),
			EmbeddingModel:    textValue(chunk.EmbeddingModel),
			EmbeddingVersion:  textValue(chunk.EmbeddingVersion),
			EmbeddingDimensions: pgtype.Int4{
				Int32: int32(chunk.EmbeddingDimensions), Valid: true,
			},
		}); err != nil {
			return Document{}, err
		}
	}
	stageTimings, err := json.Marshal(timings)
	if err != nil {
		return Document{}, err
	}
	if err := q.CompleteDocumentProcessingJob(ctx, dbqueries.CompleteDocumentProcessingJobParams{
		StageTimings: stageTimings, ID: uuidValue(jobID),
	}); err != nil {
		return Document{}, err
	}
	row, err := q.CompleteResearchDocumentProcessing(ctx, dbqueries.CompleteResearchDocumentProcessingParams{
		PageCount: pgtype.Int4{Int32: int32(len(pages)), Valid: true}, ID: job.DocumentID,
	})
	if err != nil {
		return Document{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Document{}, err
	}
	return documentFromValues(
		row.ID, row.WorkspaceID, row.Title, row.OriginalFilename, row.MimeType,
		row.ByteSize, row.Sha256, row.StorageBucket, row.StorageObjectKey, row.Status,
		row.AttemptCount, row.ErrorCode, row.ErrorMessage, row.PageCount,
		row.UploadedAt, row.ParsedAt, row.CreatedAt, row.UpdatedAt,
	), nil
}

func (s *PostgresStore) FailProcessingJob(ctx context.Context, jobID, code, message string, retryable bool) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	q := dbqueries.New(tx)
	job, err := q.GetDocumentProcessingJob(ctx, uuidValue(jobID))
	if err != nil {
		return mapStoreError(err)
	}
	requeue := retryable && job.Attempts < job.MaxAttempts
	status := "failed"
	documentStatus := "failed"
	availableAt := time.Now().UTC()
	if requeue {
		status = "queued"
		documentStatus = "queued"
		availableAt = availableAt.Add(time.Duration(job.Attempts*job.Attempts) * time.Second)
	}
	safeCode := cleanText(code, "processing_failure", 80)
	safeMessage := cleanText(message, "The document could not be processed.", 240)
	if err := q.FailDocumentProcessingJob(ctx, dbqueries.FailDocumentProcessingJobParams{
		Status: status, AvailableAt: pgtype.Timestamptz{Time: availableAt, Valid: true},
		ErrorCode: textValue(safeCode), ErrorMessage: textValue(safeMessage), ID: job.ID,
	}); err != nil {
		return err
	}
	if err := q.FailResearchDocumentProcessing(ctx, dbqueries.FailResearchDocumentProcessingParams{
		Status: documentStatus, ErrorCode: textValue(safeCode),
		ErrorMessage: textValue(safeMessage), ID: job.DocumentID,
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *PostgresStore) withUserQueries(
	ctx context.Context,
	clerkUserID string,
	run func(*dbqueries.Queries, pgtype.UUID) error,
) error {
	profileID, err := dbqueries.New(s.pool).EnsureProfile(ctx, clerkUserID)
	if err != nil {
		return err
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, "set local role aperture_api"); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "select set_config('app.current_profile_id', $1, true)", uuidString(profileID)); err != nil {
		return err
	}
	if err := run(dbqueries.New(tx), profileID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func uuidValue(value string) pgtype.UUID {
	var result pgtype.UUID
	_ = result.Scan(value)
	return result
}

func uuidValues(values []string) []pgtype.UUID {
	result := make([]pgtype.UUID, len(values))
	for index, value := range values {
		result[index] = uuidValue(value)
	}
	return result
}

func uuidString(value pgtype.UUID) string {
	if !value.Valid {
		return ""
	}
	raw := hex.EncodeToString(value.Bytes[:])
	return raw[0:8] + "-" + raw[8:12] + "-" + raw[12:16] + "-" + raw[16:20] + "-" + raw[20:32]
}

func textValue(value string) pgtype.Text {
	return pgtype.Text{String: value, Valid: value != ""}
}

func optionalTime(value pgtype.Timestamptz) *time.Time {
	if !value.Valid {
		return nil
	}
	result := value.Time.UTC()
	return &result
}

func workspaceFromValues(
	id pgtype.UUID,
	name, description, status string,
	createdAt, updatedAt pgtype.Timestamptz,
) Workspace {
	return Workspace{
		ID: uuidString(id), Name: name, Description: description, Status: status,
		CreatedAt: createdAt.Time.UTC(), UpdatedAt: updatedAt.Time.UTC(),
	}
}

func documentFromValues(
	id, workspaceID pgtype.UUID,
	title string,
	originalFilename, mimeType pgtype.Text,
	byteSize pgtype.Int8,
	sha256, storageBucket, storageObjectKey pgtype.Text,
	status string,
	attemptCount int32,
	errorCode, errorMessage pgtype.Text,
	pageCount pgtype.Int4,
	uploadedAt, parsedAt, createdAt, updatedAt pgtype.Timestamptz,
) Document {
	return Document{
		ID: uuidString(id), WorkspaceID: uuidString(workspaceID), Title: title,
		OriginalFilename: originalFilename.String, MimeType: mimeType.String,
		ByteSize: byteSize.Int64, SHA256: sha256.String, StorageBucket: storageBucket.String,
		StorageObjectKey: storageObjectKey.String, Status: status, AttemptCount: int(attemptCount),
		ErrorCode: errorCode.String, ErrorMessage: errorMessage.String, PageCount: int(pageCount.Int32),
		UploadedAt: optionalTime(uploadedAt), ParsedAt: optionalTime(parsedAt),
		CreatedAt: createdAt.Time.UTC(), UpdatedAt: updatedAt.Time.UTC(),
	}
}

func mapStoreError(err error) error {
	if err == nil || errors.Is(err, ErrConflict) {
		return err
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
