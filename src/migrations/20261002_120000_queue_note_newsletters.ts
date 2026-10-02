import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS note_newsletters (
      id uuid PRIMARY KEY,
      note_id integer NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      environment varchar(16) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      UNIQUE (note_id, environment)
    );
    CREATE TABLE IF NOT EXISTS note_newsletter_deliveries (
      id uuid PRIMARY KEY,
      newsletter_id uuid NOT NULL REFERENCES note_newsletters(id) ON DELETE CASCADE,
      email varchar(254) NOT NULL,
      message jsonb NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'review')),
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      first_attempt_at timestamptz,
      sent_at timestamptz,
      provider_id varchar(256),
      last_error varchar(100),
      UNIQUE (newsletter_id, email)
    );
    CREATE INDEX IF NOT EXISTS note_newsletter_pending_idx
      ON note_newsletter_deliveries (next_attempt_at, newsletter_id) WHERE status = 'pending';
    -- Keep reservations even if a note is deleted: deletion must not restore used quota.
    CREATE TABLE IF NOT EXISTS note_newsletter_daily_slots (
      delivery_id uuid NOT NULL,
      environment varchar(16) NOT NULL,
      day date NOT NULL,
      PRIMARY KEY (delivery_id, day)
    );
    CREATE INDEX IF NOT EXISTS note_newsletter_daily_slots_day_idx ON note_newsletter_daily_slots (environment, day);
    CREATE TABLE IF NOT EXISTS note_newsletter_runner (
      environment varchar(16) PRIMARY KEY,
      lease_token uuid,
      lease_until timestamptz NOT NULL DEFAULT '-infinity',
      paused_until timestamptz NOT NULL DEFAULT '-infinity',
      last_error varchar(100),
      budget_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
      used_today integer NOT NULL DEFAULT 0 CHECK (used_today BETWEEN 0 AND 100)
    );
    ALTER TABLE note_newsletters ENABLE ROW LEVEL SECURITY;
    ALTER TABLE note_newsletter_deliveries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE note_newsletter_daily_slots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE note_newsletter_runner ENABLE ROW LEVEL SECURITY;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS note_newsletter_deliveries;
    DROP TABLE IF EXISTS note_newsletters;
    DROP TABLE IF EXISTS note_newsletter_daily_slots;
    DROP TABLE IF EXISTS note_newsletter_runner;
  `)
}
