import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "hide" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects" DROP COLUMN IF EXISTS "hide";
  `)
}
