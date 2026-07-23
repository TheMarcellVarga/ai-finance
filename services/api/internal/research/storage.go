package research

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const ResearchDocumentsBucket = "research-documents"

type LocalStorage struct {
	root string
}

func NewLocalStorage(root string) (*LocalStorage, error) {
	root = strings.TrimSpace(root)
	if root == "" {
		return nil, errors.New("local document storage directory is required")
	}
	absolute, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(absolute, 0o700); err != nil {
		return nil, err
	}
	return &LocalStorage{root: absolute}, nil
}

func (s *LocalStorage) Mode() string {
	return "local-private"
}

func (s *LocalStorage) resolve(key string) (string, error) {
	clean := filepath.Clean(filepath.FromSlash(strings.TrimSpace(key)))
	if clean == "." || filepath.IsAbs(clean) || clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", errors.New("invalid storage object key")
	}
	target := filepath.Join(s.root, clean)
	relative, err := filepath.Rel(s.root, target)
	if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", errors.New("storage object key escapes configured root")
	}
	return target, nil
}

func (s *LocalStorage) Put(_ context.Context, key, _ string, body io.Reader, size int64) error {
	if size <= 0 || size > MaxUploadBytes {
		return ErrInvalidUpload
	}
	target, err := s.resolve(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o700); err != nil {
		return err
	}
	temp, err := os.CreateTemp(filepath.Dir(target), ".upload-*")
	if err != nil {
		return err
	}
	tempName := temp.Name()
	defer os.Remove(tempName)
	written, copyErr := io.Copy(temp, io.LimitReader(body, MaxUploadBytes+1))
	closeErr := temp.Close()
	if copyErr != nil {
		return copyErr
	}
	if closeErr != nil {
		return closeErr
	}
	if written != size || written > MaxUploadBytes {
		return ErrInvalidUpload
	}
	if err := os.Chmod(tempName, 0o600); err != nil {
		return err
	}
	return os.Rename(tempName, target)
}

func (s *LocalStorage) Open(_ context.Context, key string) (io.ReadCloser, error) {
	target, err := s.resolve(key)
	if err != nil {
		return nil, err
	}
	return os.Open(target)
}

func (s *LocalStorage) Delete(_ context.Context, key string) error {
	target, err := s.resolve(key)
	if err != nil {
		return err
	}
	if err := os.Remove(target); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

type SupabaseStorage struct {
	baseURL    string
	serviceKey string
	client     *http.Client
}

func NewSupabaseStorage(baseURL, serviceKey string) (*SupabaseStorage, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	serviceKey = strings.TrimSpace(serviceKey)
	if baseURL == "" || serviceKey == "" {
		return nil, errors.New("Supabase URL and service-role key are required for document storage")
	}
	return &SupabaseStorage{
		baseURL:    baseURL,
		serviceKey: serviceKey,
		client:     &http.Client{},
	}, nil
}

func (s *SupabaseStorage) Mode() string {
	return "supabase-private"
}

func (s *SupabaseStorage) objectURL(key string) string {
	segments := strings.Split(strings.Trim(key, "/"), "/")
	for index := range segments {
		segments[index] = url.PathEscape(segments[index])
	}
	return s.baseURL + "/storage/v1/object/" + ResearchDocumentsBucket + "/" + strings.Join(segments, "/")
}

func (s *SupabaseStorage) request(ctx context.Context, method, key, contentType string, body io.Reader) (*http.Response, error) {
	request, err := http.NewRequestWithContext(ctx, method, s.objectURL(key), body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("apikey", s.serviceKey)
	request.Header.Set("Authorization", "Bearer "+s.serviceKey)
	if contentType != "" {
		request.Header.Set("Content-Type", contentType)
	}
	request.Header.Set("x-upsert", "false")
	return s.client.Do(request)
}

func (s *SupabaseStorage) Put(ctx context.Context, key, contentType string, body io.Reader, size int64) error {
	if size <= 0 || size > MaxUploadBytes {
		return ErrInvalidUpload
	}
	response, err := s.request(ctx, http.MethodPost, key, contentType, io.LimitReader(body, MaxUploadBytes+1))
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode > 299 {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4<<10))
		return fmt.Errorf("Supabase Storage upload returned %d", response.StatusCode)
	}
	return nil
}

func (s *SupabaseStorage) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	response, err := s.request(ctx, http.MethodGet, key, "", nil)
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode > 299 {
		response.Body.Close()
		return nil, fmt.Errorf("Supabase Storage download returned %d", response.StatusCode)
	}
	return response.Body, nil
}

func (s *SupabaseStorage) Delete(ctx context.Context, key string) error {
	response, err := s.request(ctx, http.MethodDelete, key, "", nil)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode > 299 {
		return fmt.Errorf("Supabase Storage delete returned %d", response.StatusCode)
	}
	return nil
}

type MemoryStorage struct {
	mu      sync.Mutex
	objects map[string][]byte
}

func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{objects: map[string][]byte{}}
}

func (s *MemoryStorage) Mode() string {
	return "memory"
}

func (s *MemoryStorage) Put(_ context.Context, key, _ string, body io.Reader, size int64) error {
	data, err := io.ReadAll(io.LimitReader(body, MaxUploadBytes+1))
	if err != nil {
		return err
	}
	if int64(len(data)) != size || len(data) > MaxUploadBytes {
		return ErrInvalidUpload
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.objects[key] = append([]byte(nil), data...)
	return nil
}

func (s *MemoryStorage) Open(_ context.Context, key string) (io.ReadCloser, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	data, ok := s.objects[key]
	if !ok {
		return nil, os.ErrNotExist
	}
	return io.NopCloser(bytes.NewReader(append([]byte(nil), data...))), nil
}

func (s *MemoryStorage) Delete(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.objects, key)
	return nil
}
