import path from 'node:path'
import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

const heroSlides = [
  { slug: 'twinsi', filename: 'twinsi.webp', gradientColor: '#29170e' },
  { slug: 'dex', filename: 'dex.webp' },
  { slug: 'daylight', filename: 'daylight.webp' },
  { slug: 'slingshot', filename: 'slingshot.webp', gradientColor: '#20150f' },
] as const

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "pages_blocks_hero_slides" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "project_id" integer,
      "image_id" integer,
      "title" varchar,
      "description" varchar,
      "gradient_color" varchar,
      "testimonial_quote" varchar,
      "testimonial_name" varchar
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pages_blocks_hero_slides_project_id_projects_id_fk'
      ) THEN
        ALTER TABLE "pages_blocks_hero_slides"
          ADD CONSTRAINT "pages_blocks_hero_slides_project_id_projects_id_fk"
          FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pages_blocks_hero_slides_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "pages_blocks_hero_slides"
          ADD CONSTRAINT "pages_blocks_hero_slides_image_id_media_id_fk"
          FOREIGN KEY ("image_id") REFERENCES "public"."media"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pages_blocks_hero_slides_parent_id_fk'
      ) THEN
        ALTER TABLE "pages_blocks_hero_slides"
          ADD CONSTRAINT "pages_blocks_hero_slides_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "pages_blocks_hero_slides_order_idx"
      ON "pages_blocks_hero_slides" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "pages_blocks_hero_slides_parent_id_idx"
      ON "pages_blocks_hero_slides" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "pages_blocks_hero_slides_project_idx"
      ON "pages_blocks_hero_slides" USING btree ("project_id");
    CREATE INDEX IF NOT EXISTS "pages_blocks_hero_slides_image_idx"
      ON "pages_blocks_hero_slides" USING btree ("image_id");
  `)

  const [homeResult, projectResult] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: { slug: { equals: 'home' } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'projects',
      where: { slug: { in: heroSlides.map((slide) => slide.slug) } },
      depth: 0,
      limit: heroSlides.length,
      overrideAccess: true,
      req,
    }),
  ])

  const home = homeResult.docs[0]
  if (!home) return

  const projectsBySlug = new Map(projectResult.docs.map((project) => [project.slug, project]))
  const slides: Array<{
    project: number
    image: number
    gradientColor?: string
  }> = []

  for (const slide of heroSlides) {
    const project = projectsBySlug.get(slide.slug)
    if (!project) continue

    const existingMedia = await payload.find({
      collection: 'media',
      where: { filename: { equals: slide.filename } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
    })
    const media = existingMedia.docs[0] || await payload.create({
      collection: 'media',
      data: { alt: `${project.title} hero image` },
      filePath: path.resolve(process.cwd(), 'public', 'hero', slide.filename),
      overrideAccess: true,
      req,
    })

    slides.push({
      project: Number(project.id),
      image: Number(media.id),
      gradientColor: 'gradientColor' in slide ? slide.gradientColor : undefined,
    })
  }

  const sections = (home.sections || []).map((section) => (
    section.blockType === 'hero'
      ? {
          ...section,
          heading: 'Your design partner for\nfirst-generation products.',
          slides,
        }
      : section
  ))

  await payload.update({
    collection: 'pages',
    id: home.id,
    data: { sections },
    depth: 0,
    overrideAccess: true,
    req,
  })
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "pages_blocks_hero_slides" CASCADE;
  `)
}
