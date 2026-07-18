import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "module_like_events" (
      "id" serial PRIMARY KEY,
      "target_id" varchar NOT NULL,
      "visitor_hash" varchar NOT NULL,
      "location" varchar,
      "city" varchar,
      "region" varchar,
      "country" varchar,
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "module_like_events_created_at_idx"
      ON "module_like_events" ("created_at" DESC);

    CREATE INDEX IF NOT EXISTS "module_like_events_target_idx"
      ON "module_like_events" ("target_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "module_like_events";
  `)
}
