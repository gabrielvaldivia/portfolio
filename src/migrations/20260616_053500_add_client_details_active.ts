import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the `details` and `active` columns to the `clients` table. These fields
// were added to the Clients collection in code but, because the database runs
// with `push: false` and had no migrations, the columns were never created in
// the production database — causing every query that reads a client to fail
// with `column "details" does not exist`.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "details" varchar;
    ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "clients" DROP COLUMN IF EXISTS "details";
    ALTER TABLE "clients" DROP COLUMN IF EXISTS "active";
  `)
}
