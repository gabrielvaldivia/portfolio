import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    WITH "event_totals" AS (
      SELECT
        "module_likes"."target_id",
        "module_likes"."visitor_hash",
        "module_likes"."like_count"::int AS "like_count",
        COALESCE(SUM("module_like_events"."amount"), 0)::int AS "event_amount_total",
        COUNT(*) FILTER (WHERE "module_like_events"."amount" = 1)::int AS "one_amount_events"
      FROM "module_likes"
      JOIN "module_like_events"
        ON "module_like_events"."target_id" = "module_likes"."target_id"
        AND "module_like_events"."visitor_hash" = "module_likes"."visitor_hash"
      GROUP BY
        "module_likes"."target_id",
        "module_likes"."visitor_hash",
        "module_likes"."like_count"
    ),
    "inferred_superlikes" AS (
      SELECT
        "target_id",
        "visitor_hash",
        (("like_count" - "event_amount_total") / 4)::int AS "superlike_count"
      FROM "event_totals"
      WHERE
        "like_count" > "event_amount_total"
        AND ("like_count" - "event_amount_total") % 4 = 0
        AND (("like_count" - "event_amount_total") / 4) >= 1
        AND (("like_count" - "event_amount_total") / 4) <= "one_amount_events"
    ),
    "ranked_events" AS (
      SELECT
        "module_like_events"."id",
        "inferred_superlikes"."superlike_count",
        ROW_NUMBER() OVER (
          PARTITION BY "module_like_events"."target_id", "module_like_events"."visitor_hash"
          ORDER BY "module_like_events"."created_at" ASC, "module_like_events"."id" ASC
        ) AS "rank"
      FROM "module_like_events"
      JOIN "inferred_superlikes"
        ON "inferred_superlikes"."target_id" = "module_like_events"."target_id"
        AND "inferred_superlikes"."visitor_hash" = "module_like_events"."visitor_hash"
      WHERE "module_like_events"."amount" = 1
    )
    UPDATE "module_like_events"
    SET "amount" = 5
    FROM "ranked_events"
    WHERE
      "module_like_events"."id" = "ranked_events"."id"
      AND "ranked_events"."rank" <= "ranked_events"."superlike_count";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "module_like_events"
    SET "amount" = 1
    WHERE "amount" = 5;
  `)
}
