import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS note_highlight_settings (
      note_id integer PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
      paused boolean NOT NULL DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS note_highlight_blocks (
      note_id integer NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      visitor_hash varchar(64) NOT NULL,
      location varchar(180),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (note_id, visitor_hash)
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS note_highlight_blocks;
    DROP TABLE IF EXISTS note_highlight_settings;
  `)
}
