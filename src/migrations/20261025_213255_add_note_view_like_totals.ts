import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Additive: stored view and like totals so the admin notes list can sort by them.
// The generated diff also contained unrelated MCP API key column changes, left out on purpose.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "views" numeric DEFAULT 0;
  ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "likes" numeric DEFAULT 0;
  ALTER TABLE "_notes_v" ADD COLUMN IF NOT EXISTS "version_views" numeric DEFAULT 0;
  ALTER TABLE "_notes_v" ADD COLUMN IF NOT EXISTS "version_likes" numeric DEFAULT 0;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "notes" DROP COLUMN "views";
  ALTER TABLE "notes" DROP COLUMN "likes";
  ALTER TABLE "_notes_v" DROP COLUMN "version_views";
  ALTER TABLE "_notes_v" DROP COLUMN "version_likes";`)
}
