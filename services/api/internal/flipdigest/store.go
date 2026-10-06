package flipdigest

import (
	"context"
	"sync"
	"time"
)

type Preferences struct {
	Enabled      bool   `json:"enabled"`
	Direction    string `json:"direction"`
	Cadence      string `json:"cadence"`
	EmailEnabled bool   `json:"emailEnabled"`
	InAppEnabled bool   `json:"inAppEnabled"`
}

func DefaultPreferences() Preferences {
	return Preferences{Direction: "bull", Cadence: "daily", EmailEnabled: true, InAppEnabled: true}
}

type Subscriber struct {
	UserID       string `json:"userId"`
	Direction    string `json:"direction"`
	Cadence      string `json:"cadence"`
	EmailEnabled bool   `json:"emailEnabled"`
	InAppEnabled bool   `json:"inAppEnabled"`
}

type Entry struct {
	AssetClass  string `json:"assetClass"`
	Symbol      string `json:"symbol"`
	Name        string `json:"name"`
	Direction   string `json:"direction"`
	LastFlipAt  string `json:"lastFlipAt"`
	Source      string `json:"source"`
	CapturedAt  string `json:"capturedAt"`
	SignalBasis string `json:"signalBasis"`
}

type Coverage struct {
	ScannedClasses []string `json:"scannedClasses"`
	FailedClasses  []string `json:"failedClasses"`
	GeneratedAt    string   `json:"generatedAt"`
}

type Notification struct {
	ID           string     `json:"id"`
	PeriodStart  time.Time  `json:"periodStart"`
	PeriodEnd    time.Time  `json:"periodEnd"`
	Direction    string     `json:"direction"`
	Cadence      string     `json:"cadence"`
	Entries      []Entry    `json:"entries"`
	Coverage     Coverage   `json:"coverage"`
	InAppVisible bool       `json:"inAppVisible"`
	EmailEnabled bool       `json:"emailEnabled"`
	EmailSentAt  *time.Time `json:"emailSentAt"`
}

type PendingEmail struct {
	UserID       string       `json:"userId"`
	Notification Notification `json:"notification"`
}

type Repository interface {
	GetPreferences(context.Context, string) (Preferences, error)
	SavePreferences(context.Context, string, Preferences) (Preferences, error)
	ListNotifications(context.Context, string) ([]Notification, error)
	Subscribers(context.Context) ([]Subscriber, error)
	PendingEmails(context.Context) ([]PendingEmail, error)
	CreateNotification(context.Context, string, Notification) (Notification, bool, error)
	MarkEmailSent(context.Context, string) error
}

type MemoryStore struct {
	mu            sync.Mutex
	preferences   map[string]Preferences
	notifications map[string][]Notification
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{preferences: map[string]Preferences{}, notifications: map[string][]Notification{}}
}

func (s *MemoryStore) GetPreferences(_ context.Context, userID string) (Preferences, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if value, ok := s.preferences[userID]; ok {
		return value, nil
	}
	return DefaultPreferences(), nil
}

func (s *MemoryStore) SavePreferences(_ context.Context, userID string, value Preferences) (Preferences, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.preferences[userID] = value
	return value, nil
}

func (s *MemoryStore) ListNotifications(_ context.Context, userID string) ([]Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := append([]Notification{}, s.notifications[userID]...)
	visible := make([]Notification, 0, len(items))
	for _, item := range items {
		if item.InAppVisible {
			visible = append(visible, item)
		}
	}
	return visible, nil
}

func (s *MemoryStore) Subscribers(_ context.Context) ([]Subscriber, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []Subscriber{}
	for userID, value := range s.preferences {
		if value.Enabled {
			items = append(items, Subscriber{userID, value.Direction, value.Cadence, value.EmailEnabled, value.InAppEnabled})
		}
	}
	return items, nil
}

func (s *MemoryStore) PendingEmails(_ context.Context) ([]PendingEmail, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	items := []PendingEmail{}
	for userID, values := range s.notifications {
		preference := s.preferences[userID]
		if !preference.Enabled || !preference.EmailEnabled {
			continue
		}
		for _, item := range values {
			if item.EmailEnabled && item.EmailSentAt == nil && item.Direction == preference.Direction && item.Cadence == preference.Cadence {
				items = append(items, PendingEmail{userID, item})
			}
		}
	}
	return items, nil
}

func (s *MemoryStore) CreateNotification(_ context.Context, userID string, value Notification) (Notification, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	preference, ok := s.preferences[userID]
	if !ok || !preference.Enabled || preference.Cadence != value.Cadence || preference.Direction != value.Direction {
		return Notification{}, false, nil
	}
	for _, existing := range s.notifications[userID] {
		if existing.PeriodEnd.Equal(value.PeriodEnd) && existing.Cadence == value.Cadence {
			return existing, false, nil
		}
	}
	value.ID = userID + ":" + value.PeriodEnd.Format(time.RFC3339) + ":" + value.Cadence
	value.Direction = preference.Direction
	value.InAppVisible = preference.InAppEnabled
	value.EmailEnabled = preference.EmailEnabled
	s.notifications[userID] = append([]Notification{value}, s.notifications[userID]...)
	return value, true, nil
}

func (s *MemoryStore) MarkEmailSent(_ context.Context, notificationID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for userID, values := range s.notifications {
		for i := range values {
			if values[i].ID == notificationID {
				values[i].EmailSentAt = &now
				s.notifications[userID] = values
				return nil
			}
		}
	}
	return nil
}
