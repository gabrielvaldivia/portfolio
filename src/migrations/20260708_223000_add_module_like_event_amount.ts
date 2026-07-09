import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "module_like_events"
      ADD COLUMN IF NOT EXISTS "amount" integer NOT NULL DEFAULT 1;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'module_like_events_amount_range'
      ) THEN
        ALTER TABLE "module_like_events"
          ADD CONSTRAINT "module_like_events_amount_range"
          CHECK ("amount" >= 1 AND "amount" <= 5);
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "module_like_events"
      DROP CONSTRAINT IF EXISTS "module_like_events_amount_range";

    ALTER TABLE "module_like_events"
      DROP COLUMN IF EXISTS "amount";
  `)
}
