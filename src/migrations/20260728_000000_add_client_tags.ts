import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "clients_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar,
      CONSTRAINT "clients_texts_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."clients"("id")
        ON DELETE cascade ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "clients_texts_order_parent_idx"
      ON "clients_texts" ("order", "parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "clients_texts";
  `)
}
