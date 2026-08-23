import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "pages_blocks_accordion" SET "api_key" = NULL WHERE "api_key" IS NOT NULL;

    ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
    CREATE INDEX IF NOT EXISTS "conversations_owner_hash_idx"
      ON "conversations" ("owner_hash");

    CREATE TABLE IF NOT EXISTS "chat_rate_limits" (
      "key_hash" varchar PRIMARY KEY NOT NULL,
      "window_started_at" timestamp(3) with time zone NOT NULL,
      "request_count" integer DEFAULT 0 NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "chat_rate_limits_window_idx"
      ON "chat_rate_limits" ("window_started_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "chat_rate_limits";
    DROP INDEX IF EXISTS "conversations_owner_hash_idx";
    ALTER TABLE "conversations" DROP COLUMN IF EXISTS "owner_hash";
  `)
}
