package flipdigest

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresStore struct{ pool *pgxpool.Pool }

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore { return &PostgresStore{pool: pool} }

func (s *PostgresStore) GetPreferences(ctx context.Context, clerkUserID string) (Preferences, error) {
	var value Preferences
	err := s.pool.QueryRow(ctx, `select p.enabled, p.direction, p.cadence, p.email_enabled, p.in_app_enabled from public.flip_digest_preferences p
		join public.profiles u on u.id = p.user_id where u.clerk_user_id = $1`, clerkUserID).
		Scan(&value.Enabled, &value.Direction, &value.Cadence, &value.EmailEnabled, &value.InAppEnabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return DefaultPreferences(), nil
	}
	if err != nil {
		return Preferences{}, fmt.Errorf("get flip digest preferences: %w", err)
	}
	return value, nil
}

func (s *PostgresStore) SavePreferences(ctx context.Context, clerkUserID string, value Preferences) (Preferences, error) {
	_, err := s.pool.Exec(ctx, `
		insert into public.profiles (clerk_user_id) values ($1)
		on conflict (clerk_user_id) do nothing`, clerkUserID)
	if err != nil {
		return Preferences{}, fmt.Errorf("ensure flip digest profile: %w", err)
	}
	_, err = s.pool.Exec(ctx, `
		insert into public.flip_digest_preferences
		(user_id, enabled, direction, cadence, email_enabled, in_app_enabled)
		select id, $2, $3, $4, $5, $6 from public.profiles where clerk_user_id = $1
		on conflict (user_id) do update set enabled = excluded.enabled, direction = excluded.direction,
		cadence = excluded.cadence, email_enabled = excluded.email_enabled,
		in_app_enabled = excluded.in_app_enabled`,
		clerkUserID, value.Enabled, value.Direction, value.Cadence, value.EmailEnabled, value.InAppEnabled)
	if err != nil {
		return Preferences{}, fmt.Errorf("save flip digest preferences: %w", err)
	}
	return value, nil
}

func (s *PostgresStore) ListNotifications(ctx context.Context, clerkUserID string) ([]Notification, error) {
	rows, err := s.pool.Query(ctx, `select n.id::text, n.period_start, n.period_end, n.direction,
		n.cadence, n.entries, n.coverage, n.email_sent_at, n.in_app_visible, n.email_enabled from public.flip_digest_notifications n
		join public.profiles u on u.id = n.user_id where u.clerk_user_id = $1 and n.in_app_visible
		order by n.created_at desc limit 30`, clerkUserID)
	if err != nil {
		return nil, fmt.Errorf("list flip digests: %w", err)
	}
	defer rows.Close()
	items := []Notification{}
	for rows.Next() {
		var item Notification
		var entries, coverage []byte
		if err := rows.Scan(&item.ID, &item.PeriodStart, &item.PeriodEnd, &item.Direction,
			&item.Cadence, &entries, &coverage, &item.EmailSentAt, &item.InAppVisible, &item.EmailEnabled); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(entries, &item.Entries); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(coverage, &item.Coverage); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) Subscribers(ctx context.Context) ([]Subscriber, error) {
	rows, err := s.pool.Query(ctx, `select u.clerk_user_id, p.direction, p.cadence,
		p.email_enabled, p.in_app_enabled
		from public.flip_digest_preferences p join public.profiles u on u.id = p.user_id
		where p.enabled order by u.id limit 1000`)
	if err != nil {
		return nil, fmt.Errorf("list flip digest subscribers: %w", err)
	}
	defer rows.Close()
	items := []Subscriber{}
	for rows.Next() {
		var item Subscriber
		if err := rows.Scan(&item.UserID, &item.Direction, &item.Cadence, &item.EmailEnabled, &item.InAppEnabled); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) PendingEmails(ctx context.Context) ([]PendingEmail, error) {
	rows, err := s.pool.Query(ctx, `select u.clerk_user_id, n.id::text, n.period_start, n.period_end,
		n.direction, n.cadence, n.entries, n.coverage, n.email_sent_at, n.in_app_visible, n.email_enabled
		from public.flip_digest_notifications n join public.profiles u on u.id = n.user_id
		join public.flip_digest_preferences p on p.user_id = n.user_id
		where n.email_enabled and n.email_sent_at is null and p.enabled and p.email_enabled
		and p.direction = n.direction and p.cadence = n.cadence
		and n.created_at > now() - interval '7 days'
		order by n.created_at limit 100`)
	if err != nil {
		return nil, fmt.Errorf("list pending flip emails: %w", err)
	}
	defer rows.Close()
	items := []PendingEmail{}
	for rows.Next() {
		var item PendingEmail
		var entries, coverage []byte
		n := &item.Notification
		if err := rows.Scan(&item.UserID, &n.ID, &n.PeriodStart, &n.PeriodEnd,
			&n.Direction, &n.Cadence, &entries, &coverage, &n.EmailSentAt, &n.InAppVisible, &n.EmailEnabled); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(entries, &n.Entries); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(coverage, &n.Coverage); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *PostgresStore) CreateNotification(ctx context.Context, clerkUserID string, value Notification) (Notification, bool, error) {
	entries, err := json.Marshal(value.Entries)
	if err != nil {
		return Notification{}, false, err
	}
	coverage, err := json.Marshal(value.Coverage)
	if err != nil {
		return Notification{}, false, err
	}
	var id string
	err = s.pool.QueryRow(ctx, `
		insert into public.flip_digest_notifications
		(user_id, period_start, period_end, direction, cadence, entries, coverage, in_app_visible, email_enabled)
		select p.user_id, $2, $3, p.direction, p.cadence, $4::jsonb, $5::jsonb, p.in_app_enabled, p.email_enabled
		from public.flip_digest_preferences p join public.profiles u on u.id = p.user_id
		where u.clerk_user_id = $1 and p.enabled and p.cadence = $6 and p.direction = $7
		on conflict (user_id, period_end, cadence) do nothing returning id::text`,
		clerkUserID, value.PeriodStart, value.PeriodEnd, string(entries), string(coverage), value.Cadence, value.Direction).Scan(&id)
	created := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Notification{}, false, fmt.Errorf("create flip digest: %w", err)
	}
	row := s.pool.QueryRow(ctx, `select n.id::text, n.period_start, n.period_end, n.direction,
		n.cadence, n.entries, n.coverage, n.email_sent_at, n.in_app_visible, n.email_enabled
		from public.flip_digest_notifications n join public.profiles u on u.id = n.user_id
		where u.clerk_user_id = $1 and n.period_end = $2 and n.cadence = $3`,
		clerkUserID, value.PeriodEnd, value.Cadence)
	var item Notification
	var storedEntries, storedCoverage []byte
	err = row.Scan(&item.ID, &item.PeriodStart, &item.PeriodEnd, &item.Direction,
		&item.Cadence, &storedEntries, &storedCoverage, &item.EmailSentAt, &item.InAppVisible, &item.EmailEnabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return Notification{}, false, nil
	}
	if err != nil {
		return Notification{}, false, fmt.Errorf("read flip digest: %w", err)
	}
	if err := json.Unmarshal(storedEntries, &item.Entries); err != nil {
		return Notification{}, false, err
	}
	if err := json.Unmarshal(storedCoverage, &item.Coverage); err != nil {
		return Notification{}, false, err
	}
	return item, created, nil
}

func (s *PostgresStore) MarkEmailSent(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `update public.flip_digest_notifications set email_sent_at = now()
		where id = $1::uuid and email_sent_at is null`, id)
	if err != nil {
		return fmt.Errorf("mark flip digest email sent: %w", err)
	}
	return nil
}
