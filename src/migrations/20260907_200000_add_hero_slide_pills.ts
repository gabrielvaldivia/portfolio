import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Payload stores hasMany text fields in a collection-level table, including
  // nested fields such as sections.0.slides.0.pills. No existing content changes.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "pages_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar,
      CONSTRAINT "pages_texts_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id")
        ON DELETE cascade ON UPDATE no action
    );
    CREATE INDEX IF NOT EXISTS "pages_texts_order_parent"
      ON "pages_texts" ("order", "parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Keep the shared text table for any other hasMany fields added later.
  await db.execute(sql`DELETE FROM "pages_texts" WHERE "path" ~ '^sections[.][0-9]+[.]slides[.][0-9]+[.]pills$';`)
}
