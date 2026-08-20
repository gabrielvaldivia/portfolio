import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS "timeline_chapters" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL DEFAULT (gen_random_uuid())::varchar,
      "title" varchar NOT NULL,
      "content" jsonb NOT NULL,
      CONSTRAINT "timeline_chapters_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."timeline"("id")
        ON DELETE cascade ON UPDATE no action
    );

    CREATE INDEX IF NOT EXISTS "timeline_chapters_order_idx"
      ON "timeline_chapters" ("_order");
    CREATE INDEX IF NOT EXISTS "timeline_chapters_parent_id_idx"
      ON "timeline_chapters" ("_parent_id");

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'timeline'
          AND column_name = 'chapters'
      ) THEN
        INSERT INTO "timeline_chapters" ("_order", "_parent_id", "title", "content")
        SELECT
          (chapter.ordinality - 1)::integer,
          timeline."id",
          COALESCE(chapter.value ->> 'title', 'Untitled'),
          jsonb_build_object(
            'root', jsonb_build_object(
              'children', COALESCE(
                (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'children', jsonb_build_array(
                        jsonb_build_object(
                          'detail', 0,
                          'format', 0,
                          'mode', 'normal',
                          'style', '',
                          'text', paragraph.value,
                          'type', 'text',
                          'version', 1
                        )
                      ),
                      'direction', NULL,
                      'format', '',
                      'indent', 0,
                      'textFormat', 0,
                      'textStyle', '',
                      'type', 'paragraph',
                      'version', 1
                    )
                    ORDER BY paragraph.ordinality
                  )
                  FROM jsonb_array_elements_text(
                    COALESCE(chapter.value -> 'paragraphs', '[]'::jsonb)
                  ) WITH ORDINALITY AS paragraph(value, ordinality)
                ),
                '[]'::jsonb
              ),
              'direction', NULL,
              'format', '',
              'indent', 0,
              'type', 'root',
              'version', 1
            )
          )
        FROM "timeline" AS timeline
        CROSS JOIN LATERAL jsonb_array_elements(
          COALESCE(timeline."chapters", '[]'::jsonb)
        ) WITH ORDINALITY AS chapter(value, ordinality)
        WHERE NOT EXISTS (
          SELECT 1
          FROM "timeline_chapters" AS existing
          WHERE existing."_parent_id" = timeline."id"
        );

      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "timeline" ADD COLUMN IF NOT EXISTS "chapters" jsonb;

    UPDATE "timeline" AS timeline
    SET "chapters" = restored."chapters"
    FROM (
      SELECT
        chapter."_parent_id",
        jsonb_agg(
          jsonb_build_object(
            'title', chapter."title",
            'paragraphs', COALESCE(
              (
                SELECT jsonb_agg(paragraph_text ORDER BY paragraph_index)
                FROM (
                  SELECT
                    paragraph.ordinality AS paragraph_index,
                    COALESCE(
                      (
                        SELECT string_agg(text_node.value #>> '{}', '' ORDER BY text_node.ordinality)
                        FROM jsonb_path_query(paragraph.value, '$.**.text')
                          WITH ORDINALITY AS text_node(value, ordinality)
                      ),
                      ''
                    ) AS paragraph_text
                  FROM jsonb_array_elements(
                    COALESCE(chapter."content" -> 'root' -> 'children', '[]'::jsonb)
                  ) WITH ORDINALITY AS paragraph(value, ordinality)
                ) AS paragraph_values
              ),
              '[]'::jsonb
            )
          )
          ORDER BY chapter."_order"
        ) AS "chapters"
      FROM "timeline_chapters" AS chapter
      GROUP BY chapter."_parent_id"
    ) AS restored
    WHERE restored."_parent_id" = timeline."id";

    DROP TABLE IF EXISTS "timeline_chapters";
  `)
}
