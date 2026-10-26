import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects_blocks_iphone15" ADD COLUMN IF NOT EXISTS "show_status_bar" boolean DEFAULT false;
    ALTER TABLE "side_projects_blocks_iphone15" ADD COLUMN IF NOT EXISTS "show_status_bar" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "side_projects_blocks_iphone15" DROP COLUMN IF EXISTS "show_status_bar";
    ALTER TABLE "projects_blocks_iphone15" DROP COLUMN IF EXISTS "show_status_bar";
  `)
}
