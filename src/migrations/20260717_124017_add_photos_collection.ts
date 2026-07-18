import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "photos" (
      "id" serial PRIMARY KEY NOT NULL,
      "slug" varchar,
      "capture_date" timestamp(3) with time zone,
      "alt" varchar,
      "exif_camera" varchar,
      "exif_lens" varchar,
      "exif_shutter" varchar,
      "exif_aperture" varchar,
      "exif_iso" varchar,
      "exif_focal" varchar,
      "prefix" varchar DEFAULT 'photos',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric,
      "sizes_web_url" varchar,
      "sizes_web_width" numeric,
      "sizes_web_height" numeric,
      "sizes_web_mime_type" varchar,
      "sizes_web_filesize" numeric,
      "sizes_web_filename" varchar
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "photos_slug_idx" ON "photos" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "photos_updated_at_idx" ON "photos" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "photos_created_at_idx" ON "photos" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "photos_filename_idx" ON "photos" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "photos_sizes_web_sizes_web_filename_idx" ON "photos" USING btree ("sizes_web_filename");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "photos_id" integer;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_photos_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_photos_fk"
          FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_photos_id_idx"
      ON "payload_locked_documents_rels" USING btree ("photos_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_photos_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "photos_id";
    DROP TABLE IF EXISTS "photos" CASCADE;
  `)
}
