import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_note_subscribers_status" AS ENUM('pending', 'subscribed', 'unsubscribed');
  CREATE TABLE "note_subscribers" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" varchar NOT NULL,
    "status" "enum_note_subscribers_status" DEFAULT 'pending' NOT NULL,
    "confirmed_at" timestamp(3) with time zone,
    "unsubscribed_at" timestamp(3) with time zone,
    "source" varchar DEFAULT 'website',
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "notes" ADD COLUMN "newsletter_sent_at" timestamp(3) with time zone;
  ALTER TABLE "_notes_v" ADD COLUMN "version_newsletter_sent_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "note_subscribers_id" integer;
  CREATE UNIQUE INDEX "note_subscribers_email_idx" ON "note_subscribers" USING btree ("email");
  CREATE INDEX "note_subscribers_status_idx" ON "note_subscribers" USING btree ("status");
  CREATE INDEX "note_subscribers_updated_at_idx" ON "note_subscribers" USING btree ("updated_at");
  CREATE INDEX "note_subscribers_created_at_idx" ON "note_subscribers" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_note_subscribers_fk" FOREIGN KEY ("note_subscribers_id") REFERENCES "public"."note_subscribers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_note_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("note_subscribers_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_note_subscribers_fk";
  DROP INDEX "payload_locked_documents_rels_note_subscribers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "note_subscribers_id";
  ALTER TABLE "notes" DROP COLUMN "newsletter_sent_at";
  ALTER TABLE "_notes_v" DROP COLUMN "version_newsletter_sent_at";
  ALTER TABLE "note_subscribers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "note_subscribers";
  DROP TYPE "public"."enum_note_subscribers_status";`)
}
