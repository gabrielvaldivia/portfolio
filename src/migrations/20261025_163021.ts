import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "payload_mcp_api_keys" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"label" varchar,
  	"description" varchar,
  	"pages_find" boolean DEFAULT false,
  	"pages_create" boolean DEFAULT false,
  	"pages_update" boolean DEFAULT false,
  	"pages_delete" boolean DEFAULT false,
  	"notes_find" boolean DEFAULT false,
  	"notes_delete" boolean DEFAULT false,
  	"projects_find" boolean DEFAULT false,
  	"projects_create" boolean DEFAULT false,
  	"projects_update" boolean DEFAULT false,
  	"projects_delete" boolean DEFAULT false,
  	"side_projects_find" boolean DEFAULT false,
  	"side_projects_create" boolean DEFAULT false,
  	"side_projects_update" boolean DEFAULT false,
  	"side_projects_delete" boolean DEFAULT false,
  	"clients_find" boolean DEFAULT false,
  	"clients_create" boolean DEFAULT false,
  	"clients_update" boolean DEFAULT false,
  	"clients_delete" boolean DEFAULT false,
  	"people_find" boolean DEFAULT false,
  	"people_create" boolean DEFAULT false,
  	"people_update" boolean DEFAULT false,
  	"people_delete" boolean DEFAULT false,
  	"services_find" boolean DEFAULT false,
  	"services_create" boolean DEFAULT false,
  	"services_update" boolean DEFAULT false,
  	"services_delete" boolean DEFAULT false,
  	"photos_find" boolean DEFAULT false,
  	"photos_update" boolean DEFAULT false,
  	"photos_delete" boolean DEFAULT false,
  	"media_find" boolean DEFAULT false,
  	"media_update" boolean DEFAULT false,
  	"media_delete" boolean DEFAULT false,
  	"site_settings_find" boolean DEFAULT false,
  	"site_settings_update" boolean DEFAULT false,
  	"timeline_find" boolean DEFAULT false,
  	"timeline_update" boolean DEFAULT false,
	  "payload_mcp_tool_create_note_draft" boolean DEFAULT false,
	  "payload_mcp_tool_update_note_draft" boolean DEFAULT false,
	  "payload_mcp_tool_publish_note" boolean DEFAULT false,
	  "payload_mcp_tool_schedule_note" boolean DEFAULT false,
	  "payload_mcp_tool_upload_portfolio_asset" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payload_mcp_api_keys_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "payload_mcp_api_keys_id" integer;
  ALTER TABLE "payload_mcp_api_keys" ADD CONSTRAINT "payload_mcp_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_mcp_api_keys_user_idx" ON "payload_mcp_api_keys" USING btree ("user_id");
  CREATE INDEX "payload_mcp_api_keys_updated_at_idx" ON "payload_mcp_api_keys" USING btree ("updated_at");
  CREATE INDEX "payload_mcp_api_keys_created_at_idx" ON "payload_mcp_api_keys" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk" FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payload_mcp_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX "payload_preferences_rels_payload_mcp_api_keys_id_idx" ON "payload_preferences_rels" USING btree ("payload_mcp_api_keys_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk";
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk";
  DROP INDEX "payload_locked_documents_rels_payload_mcp_api_keys_id_idx";
  DROP INDEX "payload_preferences_rels_payload_mcp_api_keys_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payload_mcp_api_keys_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "payload_mcp_api_keys_id";
  ALTER TABLE "payload_mcp_api_keys" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload_mcp_api_keys" CASCADE;`)
}
