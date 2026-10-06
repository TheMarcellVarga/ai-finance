package flipdigest

import (
	"context"
	"testing"
	"time"
)

func TestMemoryStoreOptInOwnershipAndDeduplication(t *testing.T) {
	ctx := context.Background()
	store := NewMemoryStore()
	defaultPreferences, err := store.GetPreferences(ctx, "user-a")
	if err != nil || defaultPreferences.Enabled || defaultPreferences.Direction != "bull" {
		t.Fatalf("unexpected default: %#v, %v", defaultPreferences, err)
	}
	if _, err := store.SavePreferences(ctx, "user-a", Preferences{Enabled: true, Direction: "bear", Cadence: "daily", EmailEnabled: true, InAppEnabled: true}); err != nil {
		t.Fatal(err)
	}
	end := time.Date(2026, 9, 26, 0, 0, 0, 0, time.UTC)
	notification := Notification{PeriodStart: end.Add(-24 * time.Hour), PeriodEnd: end, Direction: "bear", Cadence: "daily", Entries: []Entry{{Symbol: "A", Direction: "bear"}}}
	first, created, err := store.CreateNotification(ctx, "user-a", notification)
	if err != nil || !created || first.ID == "" {
		t.Fatalf("first insert: %#v, %t, %v", first, created, err)
	}
	_, created, err = store.CreateNotification(ctx, "user-a", notification)
	if err != nil || created {
		t.Fatalf("duplicate created: %t, %v", created, err)
	}
	other, err := store.ListNotifications(ctx, "user-b")
	if err != nil || len(other) != 0 {
		t.Fatalf("cross-user data: %#v, %v", other, err)
	}
	if err := store.MarkEmailSent(ctx, first.ID); err != nil {
		t.Fatal(err)
	}
	pending, err := store.PendingEmails(ctx)
	if err != nil || len(pending) != 0 {
		t.Fatalf("email should be complete: %#v, %v", pending, err)
	}
	changed := Preferences{Enabled: true, Direction: "bull", Cadence: "daily", InAppEnabled: true}
	if _, err := store.SavePreferences(ctx, "user-a", changed); err != nil {
		t.Fatal(err)
	}
	wrong, created, err := store.CreateNotification(ctx, "user-a", Notification{PeriodStart: end, PeriodEnd: end.Add(24 * time.Hour), Direction: "bear", Cadence: "daily"})
	if err != nil || created || wrong.ID != "" {
		t.Fatalf("stale direction accepted: %#v, %t, %v", wrong, created, err)
	}
}
