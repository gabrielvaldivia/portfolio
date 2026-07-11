import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_projects_blocks_browser_columns') THEN
        CREATE TYPE "public"."enum_projects_blocks_browser_columns" AS ENUM ('1', '2', '3', '4', '5', '6');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_projects_blocks_browser_rows') THEN
        CREATE TYPE "public"."enum_projects_blocks_browser_rows" AS ENUM ('1', '2', '3', '4', '5', '6', 'wrap');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_projects_blocks_browser_fit') THEN
        CREATE TYPE "public"."enum_projects_blocks_browser_fit" AS ENUM ('cover', 'contain');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_side_projects_blocks_browser_columns') THEN
        CREATE TYPE "public"."enum_side_projects_blocks_browser_columns" AS ENUM ('1', '2', '3', '4', '5', '6');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_side_projects_blocks_browser_rows') THEN
        CREATE TYPE "public"."enum_side_projects_blocks_browser_rows" AS ENUM ('1', '2', '3', '4', '5', '6', 'wrap');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_side_projects_blocks_browser_fit') THEN
        CREATE TYPE "public"."enum_side_projects_blocks_browser_fit" AS ENUM ('cover', 'contain');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "projects_blocks_browser" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL DEFAULT '',
      "id" varchar PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid())::varchar,
      "columns" "public"."enum_projects_blocks_browser_columns" DEFAULT '6',
      "rows" "public"."enum_projects_blocks_browser_rows" DEFAULT 'wrap',
      "image_id" integer,
      "address" varchar DEFAULT 'gabrielvaldivia.com',
      "caption" varchar,
      "fit" "public"."enum_projects_blocks_browser_fit" DEFAULT 'cover',
      "padding" varchar DEFAULT '0',
      "bg_color" varchar DEFAULT 'alt',
      "image_border" boolean DEFAULT false,
      "shadow" boolean DEFAULT false,
      "block_name" varchar,
      CONSTRAINT "projects_blocks_browser_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id")
        ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "projects_blocks_browser_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "projects_blocks_browser_order_idx" ON "projects_blocks_browser" ("_order");
    CREATE INDEX IF NOT EXISTS "projects_blocks_browser_parent_id_idx" ON "projects_blocks_browser" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "projects_blocks_browser_path_idx" ON "projects_blocks_browser" ("_path");
    CREATE INDEX IF NOT EXISTS "projects_blocks_browser_image_idx" ON "projects_blocks_browser" ("image_id");

    CREATE TABLE IF NOT EXISTS "side_projects_blocks_browser" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL DEFAULT '',
      "id" varchar PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid())::varchar,
      "columns" "public"."enum_side_projects_blocks_browser_columns" DEFAULT '6',
      "rows" "public"."enum_side_projects_blocks_browser_rows" DEFAULT 'wrap',
      "image_id" integer,
      "address" varchar DEFAULT 'gabrielvaldivia.com',
      "caption" varchar,
      "fit" "public"."enum_side_projects_blocks_browser_fit" DEFAULT 'cover',
      "padding" varchar DEFAULT '0',
      "bg_color" varchar DEFAULT 'alt',
      "image_border" boolean DEFAULT false,
      "shadow" boolean DEFAULT false,
      "block_name" varchar,
      CONSTRAINT "side_projects_blocks_browser_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."side_projects"("id")
        ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "side_projects_blocks_browser_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "side_projects_blocks_browser_order_idx" ON "side_projects_blocks_browser" ("_order");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_browser_parent_id_idx" ON "side_projects_blocks_browser" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_browser_path_idx" ON "side_projects_blocks_browser" ("_path");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_browser_image_idx" ON "side_projects_blocks_browser" ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "side_projects_blocks_browser";
    DROP TABLE IF EXISTS "projects_blocks_browser";
    DROP TYPE IF EXISTS "public"."enum_side_projects_blocks_browser_fit";
    DROP TYPE IF EXISTS "public"."enum_side_projects_blocks_browser_rows";
    DROP TYPE IF EXISTS "public"."enum_side_projects_blocks_browser_columns";
    DROP TYPE IF EXISTS "public"."enum_projects_blocks_browser_fit";
    DROP TYPE IF EXISTS "public"."enum_projects_blocks_browser_rows";
    DROP TYPE IF EXISTS "public"."enum_projects_blocks_browser_columns";
  `)
}
