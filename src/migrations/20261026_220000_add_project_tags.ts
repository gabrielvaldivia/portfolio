import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "projects_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar,
      CONSTRAINT "projects_texts_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id")
        ON DELETE cascade ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "projects_texts_order_parent_idx"
      ON "projects_texts" ("order", "parent_id");

    -- Start each project with its client's tags, which the Work filter used until now.
    INSERT INTO "projects_texts" ("order", "parent_id", "path", "text")
    SELECT client_tags."order", projects."id", 'tags', client_tags."text"
    FROM "projects"
    JOIN "clients_texts" client_tags
      ON client_tags."parent_id" = projects."client_id" AND client_tags."path" = 'tags'
    WHERE NOT EXISTS (
      SELECT 1 FROM "projects_texts" existing
      WHERE existing."parent_id" = projects."id" AND existing."path" = 'tags'
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "projects_texts";
  `)
}
