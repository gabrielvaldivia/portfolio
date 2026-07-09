import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "module_likes" (
      "id" serial PRIMARY KEY,
      "target_id" varchar NOT NULL,
      "visitor_hash" varchar NOT NULL,
      "like_count" integer NOT NULL DEFAULT 0,
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "module_likes_target_visitor_idx"
      ON "module_likes" ("target_id", "visitor_hash");

    CREATE INDEX IF NOT EXISTS "module_likes_target_idx"
      ON "module_likes" ("target_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'module_likes_count_range'
      ) THEN
        ALTER TABLE "module_likes"
          ADD CONSTRAINT "module_likes_count_range"
          CHECK ("like_count" >= 0 AND "like_count" <= 50);
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "module_likes";
  `)
}
