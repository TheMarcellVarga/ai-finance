package research

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"unicode/utf8"
)

type ParseError struct {
	Code      string
	Message   string
	Retryable bool
}

func (e *ParseError) Error() string {
	return e.Message
}

type PageAwareParser struct {
	PDFToTextPath string
}

func NewPageAwareParser(pdfToTextPath string) (*PageAwareParser, error) {
	if strings.TrimSpace(pdfToTextPath) == "" {
		resolved, err := exec.LookPath("pdftotext")
		if err != nil {
			return nil, errors.New("pdftotext is required for PDF parsing")
		}
		pdfToTextPath = resolved
	}
	return &PageAwareParser{PDFToTextPath: pdfToTextPath}, nil
}

func (p *PageAwareParser) Parse(ctx context.Context, source io.Reader, mimeType string) ([]Page, error) {
	data, err := io.ReadAll(io.LimitReader(source, MaxUploadBytes+1))
	if err != nil {
		return nil, &ParseError{Code: "storage_read_failed", Message: "The stored document could not be read.", Retryable: true}
	}
	if len(data) == 0 || len(data) > MaxUploadBytes {
		return nil, &ParseError{Code: "invalid_stored_file", Message: "The stored document is empty or exceeds the file limit."}
	}

	switch mimeType {
	case "text/plain":
		if !utf8.Valid(data) || bytes.IndexByte(data, 0) >= 0 {
			return nil, &ParseError{Code: "invalid_text_encoding", Message: "Text documents must use valid UTF-8 encoding."}
		}
		return normalizedPages(string(data), "text")
	case "application/pdf":
		if !bytes.HasPrefix(data, []byte("%PDF-")) {
			return nil, &ParseError{Code: "invalid_pdf_signature", Message: "The stored PDF signature is invalid."}
		}
		return p.parsePDF(ctx, data)
	default:
		return nil, &ParseError{Code: "unsupported_file_type", Message: "Only PDF and UTF-8 text documents can be processed."}
	}
}

func (p *PageAwareParser) parsePDF(ctx context.Context, data []byte) ([]Page, error) {
	temp, err := os.CreateTemp("", "aperture-document-*.pdf")
	if err != nil {
		return nil, &ParseError{Code: "parser_tempfile_failed", Message: "The PDF parser could not prepare the document.", Retryable: true}
	}
	tempName := temp.Name()
	defer os.Remove(tempName)
	if _, err := temp.Write(data); err != nil {
		temp.Close()
		return nil, &ParseError{Code: "parser_tempfile_failed", Message: "The PDF parser could not prepare the document.", Retryable: true}
	}
	if err := temp.Close(); err != nil {
		return nil, &ParseError{Code: "parser_tempfile_failed", Message: "The PDF parser could not prepare the document.", Retryable: true}
	}

	command := exec.CommandContext(ctx, p.PDFToTextPath, "-layout", "-enc", "UTF-8", tempName, "-")
	var output bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &output
	command.Stderr = &stderr
	if err := command.Run(); err != nil {
		if ctx.Err() != nil {
			return nil, &ParseError{Code: "parsing_canceled", Message: "Document processing was canceled.", Retryable: true}
		}
		return nil, &ParseError{Code: "pdf_parse_failed", Message: "The PDF text layer could not be extracted."}
	}
	return normalizedPages(output.String(), "pdf")
}

func normalizedPages(value, sourceType string) ([]Page, error) {
	value = strings.ReplaceAll(value, "\r\n", "\n")
	value = strings.ReplaceAll(value, "\r", "\n")
	rawPages := strings.Split(value, "\f")
	if len(rawPages) > 0 && strings.TrimSpace(rawPages[len(rawPages)-1]) == "" {
		rawPages = rawPages[:len(rawPages)-1]
	}
	if len(rawPages) == 0 {
		rawPages = []string{value}
	}
	if len(rawPages) > MaxPages {
		return nil, &ParseError{Code: "page_limit_exceeded", Message: fmt.Sprintf("Documents may contain at most %d pages.", MaxPages)}
	}

	pages := make([]Page, 0, len(rawPages))
	hasText := false
	for index, rawPage := range rawPages {
		lines := strings.Split(rawPage, "\n")
		for lineIndex := range lines {
			lines[lineIndex] = strings.TrimRight(lines[lineIndex], " \t")
		}
		normalized := strings.TrimSpace(strings.Join(lines, "\n"))
		if len([]rune(normalized)) > MaxCharactersPerPage {
			return nil, &ParseError{Code: "page_character_limit_exceeded", Message: "A document page contains too much extractable text."}
		}
		if normalized != "" {
			hasText = true
		}
		digest := sha256.Sum256([]byte(normalized))
		pages = append(pages, Page{
			PageNumber:     index + 1,
			NormalizedText: normalized,
			TextSHA256:     hex.EncodeToString(digest[:]),
			CharacterCount: len([]rune(normalized)),
			SourceMetadata: map[string]any{
				"sourceType": sourceType,
				"pageNumber": index + 1,
			},
		})
	}
	if !hasText {
		return nil, &ParseError{Code: "no_extractable_text", Message: "No extractable text was found. Scanned-image OCR is not available yet."}
	}
	return pages, nil
}
