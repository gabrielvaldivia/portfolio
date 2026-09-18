import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`
    ALTER TABLE notes ADD COLUMN scheduled_for timestamptz(3), ADD COLUMN first_published_at timestamptz(3);
    ALTER TABLE _notes_v ADD COLUMN version_scheduled_for timestamptz(3), ADD COLUMN version_first_published_at timestamptz(3);
    CREATE INDEX notes_scheduled_for_idx ON notes (scheduled_for);
    CREATE INDEX _notes_v_version_scheduled_for_idx ON _notes_v (version_scheduled_for);
    -- Existing publications must never generate a new first-publication email.
    UPDATE notes n SET first_published_at = COALESCE(n.published_at, n.created_at)
    WHERE n._status = 'published' OR n.newsletter_sent_at IS NOT NULL
      OR EXISTS (SELECT 1 FROM _notes_v v WHERE v.parent_id = n.id AND v.version__status = 'published');
    UPDATE _notes_v v SET version_first_published_at = n.first_published_at
    FROM notes n WHERE v.parent_id = n.id AND n.first_published_at IS NOT NULL;
  `)
}
export async function down({ db }: MigrateDownArgs) {
  await db.execute(sql`
    ALTER TABLE notes DROP COLUMN scheduled_for, DROP COLUMN first_published_at;
    ALTER TABLE _notes_v DROP COLUMN version_scheduled_for, DROP COLUMN version_first_published_at;
  `)
}
