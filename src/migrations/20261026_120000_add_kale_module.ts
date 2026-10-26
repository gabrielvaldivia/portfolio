import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_projects_blocks_kale_columns') THEN
        CREATE TYPE "public"."enum_projects_blocks_kale_columns" AS ENUM ('1', '2', '3', '4', '5', '6');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_projects_blocks_kale_rows') THEN
        CREATE TYPE "public"."enum_projects_blocks_kale_rows" AS ENUM ('1', '2', '3', '4', '5', '6', 'wrap');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_projects_blocks_kale_case_color') THEN
        CREATE TYPE "public"."enum_projects_blocks_kale_case_color" AS ENUM ('chalk', 'periwinkle', 'sage');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_side_projects_blocks_kale_columns') THEN
        CREATE TYPE "public"."enum_side_projects_blocks_kale_columns" AS ENUM ('1', '2', '3', '4', '5', '6');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_side_projects_blocks_kale_rows') THEN
        CREATE TYPE "public"."enum_side_projects_blocks_kale_rows" AS ENUM ('1', '2', '3', '4', '5', '6', 'wrap');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_side_projects_blocks_kale_case_color') THEN
        CREATE TYPE "public"."enum_side_projects_blocks_kale_case_color" AS ENUM ('chalk', 'periwinkle', 'sage');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "projects_blocks_kale" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL DEFAULT '',
      "id" varchar PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid())::varchar,
      "columns" "public"."enum_projects_blocks_kale_columns" DEFAULT '6',
      "rows" "public"."enum_projects_blocks_kale_rows" DEFAULT 'wrap',
      "video_id" integer,
      "image_id" integer,
      "case_color" "public"."enum_projects_blocks_kale_case_color" DEFAULT 'chalk',
      "block_name" varchar,
      CONSTRAINT "projects_blocks_kale_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id")
        ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "projects_blocks_kale_video_id_media_id_fk"
        FOREIGN KEY ("video_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action,
      CONSTRAINT "projects_blocks_kale_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "projects_blocks_kale_order_idx" ON "projects_blocks_kale" ("_order");
    CREATE INDEX IF NOT EXISTS "projects_blocks_kale_parent_id_idx" ON "projects_blocks_kale" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "projects_blocks_kale_path_idx" ON "projects_blocks_kale" ("_path");
    CREATE INDEX IF NOT EXISTS "projects_blocks_kale_video_idx" ON "projects_blocks_kale" ("video_id");
    CREATE INDEX IF NOT EXISTS "projects_blocks_kale_image_idx" ON "projects_blocks_kale" ("image_id");

    CREATE TABLE IF NOT EXISTS "side_projects_blocks_kale" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL DEFAULT '',
      "id" varchar PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid())::varchar,
      "columns" "public"."enum_side_projects_blocks_kale_columns" DEFAULT '6',
      "rows" "public"."enum_side_projects_blocks_kale_rows" DEFAULT 'wrap',
      "video_id" integer,
      "image_id" integer,
      "case_color" "public"."enum_side_projects_blocks_kale_case_color" DEFAULT 'chalk',
      "block_name" varchar,
      CONSTRAINT "side_projects_blocks_kale_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."side_projects"("id")
        ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "side_projects_blocks_kale_video_id_media_id_fk"
        FOREIGN KEY ("video_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action,
      CONSTRAINT "side_projects_blocks_kale_image_id_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "side_projects_blocks_kale_order_idx" ON "side_projects_blocks_kale" ("_order");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_kale_parent_id_idx" ON "side_projects_blocks_kale" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_kale_path_idx" ON "side_projects_blocks_kale" ("_path");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_kale_video_idx" ON "side_projects_blocks_kale" ("video_id");
    CREATE INDEX IF NOT EXISTS "side_projects_blocks_kale_image_idx" ON "side_projects_blocks_kale" ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "side_projects_blocks_kale";
    DROP TABLE IF EXISTS "projects_blocks_kale";
    DROP TYPE IF EXISTS "public"."enum_side_projects_blocks_kale_case_color";
    DROP TYPE IF EXISTS "public"."enum_side_projects_blocks_kale_rows";
    DROP TYPE IF EXISTS "public"."enum_side_projects_blocks_kale_columns";
    DROP TYPE IF EXISTS "public"."enum_projects_blocks_kale_case_color";
    DROP TYPE IF EXISTS "public"."enum_projects_blocks_kale_rows";
    DROP TYPE IF EXISTS "public"."enum_projects_blocks_kale_columns";
  `)
}
