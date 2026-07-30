package research

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"mime"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

type ValidatedUpload struct {
	Bytes     []byte
	MimeType  string
	Extension string
	SHA256    string
}

type ValidationError struct {
	Code    string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func ValidateUpload(filename, declaredMime string, data []byte) (ValidatedUpload, error) {
	if len(data) == 0 {
		return ValidatedUpload{}, &ValidationError{Code: "empty_file", Message: "The selected file is empty."}
	}
	if len(data) > MaxUploadBytes {
		return ValidatedUpload{}, &ValidationError{Code: "file_too_large", Message: "Files must be 10 MiB or smaller."}
	}

	extension := strings.ToLower(filepath.Ext(strings.TrimSpace(filename)))
	normalizedMime, _, _ := mime.ParseMediaType(declaredMime)
	switch extension {
	case ".pdf":
		if !bytes.HasPrefix(data, []byte("%PDF-")) {
			return ValidatedUpload{}, &ValidationError{Code: "invalid_pdf_signature", Message: "The file extension is PDF, but the file signature is not valid."}
		}
		normalizedMime = "application/pdf"
	case ".txt":
		if bytes.IndexByte(data, 0) >= 0 || !utf8.Valid(data) {
			return ValidatedUpload{}, &ValidationError{Code: "invalid_text_encoding", Message: "Text documents must be valid UTF-8 without binary content."}
		}
		normalizedMime = "text/plain"
	default:
		return ValidatedUpload{}, &ValidationError{Code: "unsupported_file_type", Message: "Upload a PDF or UTF-8 text document."}
	}

	if normalizedMime != "application/pdf" && normalizedMime != "text/plain" {
		return ValidatedUpload{}, &ValidationError{Code: "unsupported_mime_type", Message: "Upload a PDF or UTF-8 text document."}
	}

	digest := sha256.Sum256(data)
	return ValidatedUpload{
		Bytes:     data,
		MimeType:  normalizedMime,
		Extension: extension,
		SHA256:    hex.EncodeToString(digest[:]),
	}, nil
}

func ObjectKey(profileID, workspaceID, documentID, extension string) string {
	return fmt.Sprintf(
		"profiles/%s/workspaces/%s/documents/%s/source%s",
		profileID,
		workspaceID,
		documentID,
		extension,
	)
}

func ValidateAnalysisReviewEvent(input AppendAnalysisReviewEventInput) (AppendAnalysisReviewEventInput, error) {
	input.RequestID = strings.TrimSpace(input.RequestID)
	input.SectionKey = strings.TrimSpace(input.SectionKey)
	input.EventType = strings.TrimSpace(input.EventType)
	input.ContentEventID = strings.TrimSpace(input.ContentEventID)
	input.SectionTitle = strings.TrimSpace(input.SectionTitle)
	input.SectionBody = strings.TrimSpace(input.SectionBody)
	input.Note = strings.TrimSpace(input.Note)
	input.CitationChunkID = strings.TrimSpace(input.CitationChunkID)

	if !validUUID(input.RequestID) {
		return input, &ValidationError{Code: "invalid_request_id", Message: "A valid review request ID is required."}
	}
	switch input.SectionKey {
	case "executive_summary", "operating_signals", "risk_factors", "questions_for_review":
	default:
		return input, &ValidationError{Code: "invalid_section", Message: "Choose a section from the active analysis result."}
	}
	switch input.EventType {
	case "edit_saved":
		if input.SectionTitle == "" || input.SectionBody == "" {
			return input, &ValidationError{Code: "review_content_required", Message: "Edited section title and body are required."}
		}
		if input.ContentEventID != "" || input.Note != "" || input.CitationChunkID != "" {
			return input, &ValidationError{Code: "invalid_review_payload", Message: "The edit payload contains fields that do not apply."}
		}
	case "accepted", "rejected":
		if input.ContentEventID != "" && !validUUID(input.ContentEventID) {
			return input, &ValidationError{Code: "invalid_content_reference", Message: "The selected edited content version is invalid."}
		}
		if input.SectionTitle != "" || input.SectionBody != "" || input.CitationChunkID != "" {
			return input, &ValidationError{Code: "invalid_review_payload", Message: "The decision payload contains fields that do not apply."}
		}
	case "citation_flagged":
		if !validUUID(input.CitationChunkID) || input.Note == "" {
			return input, &ValidationError{Code: "citation_feedback_required", Message: "Choose a citation and explain what appears incorrect."}
		}
		if input.ContentEventID != "" || input.SectionTitle != "" || input.SectionBody != "" {
			return input, &ValidationError{Code: "invalid_review_payload", Message: "The citation feedback payload contains fields that do not apply."}
		}
	default:
		return input, &ValidationError{Code: "invalid_review_event", Message: "Choose a supported human review action."}
	}
	if utf8.RuneCountInString(input.SectionTitle) > 160 {
		return input, &ValidationError{Code: "review_title_too_long", Message: "Edited section titles must be 160 characters or fewer."}
	}
	if utf8.RuneCountInString(input.SectionBody) > 12000 {
		return input, &ValidationError{Code: "review_body_too_long", Message: "Edited section bodies must be 12,000 characters or fewer."}
	}
	if utf8.RuneCountInString(input.Note) > 2000 {
		return input, &ValidationError{Code: "review_note_too_long", Message: "Review notes must be 2,000 characters or fewer."}
	}
	return input, nil
}

func validUUID(value string) bool {
	if len(value) != 36 || value[8] != '-' || value[13] != '-' || value[18] != '-' || value[23] != '-' {
		return false
	}
	_, err := hex.DecodeString(strings.ReplaceAll(value, "-", ""))
	return err == nil
}
