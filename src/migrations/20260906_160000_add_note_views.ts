import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "note_views" (
      "note_id" integer NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
      "visitor_hash" varchar(64) NOT NULL,
      "viewed_on" date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
      PRIMARY KEY ("note_id", "visitor_hash", "viewed_on")
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "note_views";`)
}
