import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS engagement_notifications (
      idempotency_key varchar(256) PRIMARY KEY NOT NULL,
      environment varchar(16) NOT NULL,
      message jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz,
      last_error varchar(64)
    );
    CREATE INDEX IF NOT EXISTS engagement_notifications_pending_idx
      ON engagement_notifications (environment, next_attempt_at, created_at)
      WHERE sent_at IS NULL;
    ALTER TABLE engagement_notifications ENABLE ROW LEVEL SECURITY;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS engagement_notifications;`)
}
