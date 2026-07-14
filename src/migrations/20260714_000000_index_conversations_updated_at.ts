import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "conversations_updated_at_id_idx"
    ON "conversations" ("updated_at" DESC, "id" DESC);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "conversations_updated_at_id_idx";
  `)
}
