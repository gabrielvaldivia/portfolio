import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "note_highlights" (
      "note_id" integer NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
      "anchor_key" varchar(64) NOT NULL,
      "visitor_hash" varchar(64) NOT NULL,
      "quote" varchar(1000) NOT NULL CHECK (char_length("quote") >= 3),
      "prefix" varchar(64) NOT NULL,
      "suffix" varchar(64) NOT NULL,
      "start_offset" integer NOT NULL CHECK ("start_offset" >= 0),
      "end_offset" integer NOT NULL CHECK ("end_offset" > "start_offset"),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("note_id", "anchor_key", "visitor_hash")
    );
    CREATE INDEX IF NOT EXISTS "note_highlights_visitor_idx"
      ON "note_highlights" ("note_id", "visitor_hash");
    CREATE TABLE IF NOT EXISTS "note_highlight_rate_limits" (
      "key_hash" varchar(64) PRIMARY KEY,
      "window_started_at" timestamptz NOT NULL,
      "request_count" integer NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS "note_highlight_rate_limits_window_idx"
      ON "note_highlight_rate_limits" ("window_started_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "note_highlights";
    DROP TABLE IF EXISTS "note_highlight_rate_limits";
  `)
}
