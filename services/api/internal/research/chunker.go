package research

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"unicode"
)

const (
	PageWindowChunkerVersion = "page-window-v1"
	defaultChunkTarget       = 1200
	defaultChunkMaximum      = 1600
	defaultChunkOverlap      = 200
)

type PageWindowChunker struct {
	TargetCharacters  int
	MaximumCharacters int
	OverlapCharacters int
}

type textSpan struct {
	start int
	end   int
	text  string
}

func NewPageWindowChunker() *PageWindowChunker {
	return &PageWindowChunker{
		TargetCharacters:  defaultChunkTarget,
		MaximumCharacters: defaultChunkMaximum,
		OverlapCharacters: defaultChunkOverlap,
	}
}

func (c *PageWindowChunker) Version() string {
	return PageWindowChunkerVersion
}

func (c *PageWindowChunker) Chunk(document Document, pages []Page) ([]Chunk, error) {
	target, maximum, overlap := c.limits()
	if strings.TrimSpace(document.ID) == "" || strings.TrimSpace(document.WorkspaceID) == "" {
		return nil, fmt.Errorf("document and workspace IDs are required for chunking")
	}

	result := make([]Chunk, 0)
	for _, page := range pages {
		if page.PageNumber < 1 {
			return nil, fmt.Errorf("page number must be positive")
		}
		units := sentenceSpans(page.NormalizedText, maximum)
		for sequence, start := 0, 0; start < len(units); sequence++ {
			end, characterCount := start, 0
			for end < len(units) {
				added := len([]rune(units[end].text))
				if end > start {
					added++
				}
				if end > start && characterCount+added > maximum {
					break
				}
				characterCount += added
				end++
				if characterCount >= target {
					break
				}
			}
			if end == start {
				end++
			}

			selected := units[start:end]
			chunkText := joinSpanText(selected)
			contentHash := sha256Hex(chunkText)
			characterStart := selected[0].start
			characterEnd := selected[len(selected)-1].end
			stableKey := sha256Hex(fmt.Sprintf(
				"%s|%s|%d|%d|%d|%d|%s",
				document.ID,
				c.Version(),
				page.PageNumber,
				sequence,
				characterStart,
				characterEnd,
				contentHash,
			))
			result = append(result, Chunk{
				ID:             stableUUID(stableKey),
				DocumentID:     document.ID,
				WorkspaceID:    document.WorkspaceID,
				PageNumber:     page.PageNumber,
				Sequence:       sequence,
				ChunkText:      chunkText,
				SourceLocator:  fmt.Sprintf("page:%d", page.PageNumber),
				HeadingPath:    []string{},
				CharacterStart: characterStart,
				CharacterEnd:   characterEnd,
				StableKey:      stableKey,
				ContentSHA256:  contentHash,
				ChunkerVersion: c.Version(),
			})

			if end == len(units) {
				break
			}
			next := end
			overlapSize := 0
			for next > start+1 {
				candidateSize := len([]rune(units[next-1].text))
				if overlapSize > 0 {
					candidateSize++
				}
				if overlapSize+candidateSize > overlap {
					break
				}
				overlapSize += candidateSize
				next--
			}
			start = next
		}
	}
	return result, nil
}

func (c *PageWindowChunker) limits() (int, int, int) {
	target := c.TargetCharacters
	maximum := c.MaximumCharacters
	overlap := c.OverlapCharacters
	if target <= 0 {
		target = defaultChunkTarget
	}
	if maximum < target {
		maximum = max(target, defaultChunkMaximum)
	}
	if overlap < 0 || overlap >= target {
		overlap = defaultChunkOverlap
	}
	return target, maximum, overlap
}

func sentenceSpans(value string, maximum int) []textSpan {
	runes := []rune(value)
	result := make([]textSpan, 0)
	start := -1
	for index, current := range runes {
		if start < 0 && !unicode.IsSpace(current) {
			start = index
		}
		if start < 0 {
			continue
		}
		endSentence := (current == '.' || current == '!' || current == '?') &&
			(index+1 == len(runes) || unicode.IsSpace(runes[index+1]))
		endParagraph := current == '\n' && index+1 < len(runes) && runes[index+1] == '\n'
		if endSentence || endParagraph {
			result = appendSplitSpan(result, runes, start, index+1, maximum)
			start = -1
		}
	}
	if start >= 0 {
		result = appendSplitSpan(result, runes, start, len(runes), maximum)
	}
	return result
}

func appendSplitSpan(result []textSpan, runes []rune, start, end, maximum int) []textSpan {
	for start < end && unicode.IsSpace(runes[start]) {
		start++
	}
	for end > start && unicode.IsSpace(runes[end-1]) {
		end--
	}
	for end-start > maximum {
		split := start + maximum
		for split > start && !unicode.IsSpace(runes[split]) {
			split--
		}
		if split == start {
			split = start + maximum
		}
		result = append(result, textSpan{start: start, end: split, text: normalizeChunkText(string(runes[start:split]))})
		start = split
		for start < end && unicode.IsSpace(runes[start]) {
			start++
		}
	}
	if start < end {
		result = append(result, textSpan{start: start, end: end, text: normalizeChunkText(string(runes[start:end]))})
	}
	return result
}

func joinSpanText(spans []textSpan) string {
	parts := make([]string, 0, len(spans))
	for _, span := range spans {
		if span.text != "" {
			parts = append(parts, span.text)
		}
	}
	return strings.Join(parts, " ")
}

func normalizeChunkText(value string) string {
	return strings.Join(strings.Fields(value), " ")
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func stableUUID(hexDigest string) string {
	raw, err := hex.DecodeString(hexDigest[:32])
	if err != nil {
		panic("invalid stable chunk digest")
	}
	raw[6] = (raw[6] & 0x0f) | 0x50
	raw[8] = (raw[8] & 0x3f) | 0x80
	value := hex.EncodeToString(raw)
	return value[0:8] + "-" + value[8:12] + "-" + value[12:16] + "-" + value[16:20] + "-" + value[20:32]
}
