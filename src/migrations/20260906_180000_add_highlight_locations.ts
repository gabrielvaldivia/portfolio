import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Nullable so existing highlights keep their original timestamp without an
  // invented location. No note content or reader identifiers are changed.
  await db.execute(sql`ALTER TABLE note_highlights ADD COLUMN IF NOT EXISTS location varchar(180);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE note_highlights DROP COLUMN IF EXISTS location;`)
}
