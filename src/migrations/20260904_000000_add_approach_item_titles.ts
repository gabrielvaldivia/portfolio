import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages_blocks_numbered_grid_items"
      ADD COLUMN IF NOT EXISTS "title" varchar;

    UPDATE "pages_blocks_numbered_grid_items"
    SET "title" = COALESCE(
      NULLIF(BTRIM("text" #>> '{root,children,0,children,0,text}'), ''),
      'Step ' || ("_order" + 1)::text
    )
    WHERE "title" IS NULL;

    UPDATE "pages_blocks_numbered_grid_items"
    SET "text" = CASE
      WHEN ("text" #- '{root,children,0,children,0}') #>> '{root,children,0,children,0,text}' IS NOT NULL
      THEN jsonb_set(
        "text" #- '{root,children,0,children,0}',
        '{root,children,0,children,0,text}',
        to_jsonb(LTRIM(("text" #- '{root,children,0,children,0}') #>> '{root,children,0,children,0,text}')),
        false
      )
      ELSE "text" #- '{root,children,0,children,0}'
    END
    WHERE "text" IS NOT NULL
      AND (COALESCE("text" #>> '{root,children,0,children,0,format}', '0')::integer & 1) = 1;

    ALTER TABLE "pages_blocks_numbered_grid_items"
      ALTER COLUMN "title" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "pages_blocks_numbered_grid_items"
    SET "text" = jsonb_insert(
      "text",
      '{root,children,0,children,0}',
      jsonb_build_object(
        'mode', 'normal',
        'text', "title" || ' ',
        'type', 'text',
        'style', '',
        'detail', 0,
        'format', 1,
        'version', 1
      ),
      false
    )
    WHERE "text" IS NOT NULL
      AND "title" IS NOT NULL;

    ALTER TABLE "pages_blocks_numbered_grid_items"
      DROP COLUMN IF EXISTS "title";
  `)
}
