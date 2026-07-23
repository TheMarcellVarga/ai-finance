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
