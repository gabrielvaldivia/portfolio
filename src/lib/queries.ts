import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { sql } from '@payloadcms/db-postgres'
import type { Where } from 'payload'
import type { ResponsiveImageMedia } from './responsiveImage'
import { getPayload } from './payload'
import type { PageLike } from './pageMetadata'
import { getPagePath, sortPagesByOrder, type OrderedPage } from './pageOrdering'
import { orderSiteNavigationItems } from './siteNavigation'

type GetProjectsOptions = {
  includeHidden?: boolean
  slugs?: string[]
}

type PageQueryResult = PageLike & {
  title: string
  content?: unknown
  [key: string]: unknown
}

type NavigationPageResult = OrderedPage & {
  status?: string | null
}

type FooterSocialLink = {
  platform: string | null
  url: string | null
}

type ReadNextNote = {
  title: string
  slug: string
}

type NoteMedia = {
  alt?: string | null
  height?: number | null
  url?: string | null
  width?: number | null
}

type PublishedNote = {
  _status?: 'draft' | 'published' | null
  body: unknown
  coverImage?: number | string | NoteMedia | null
  createdAt: string
  excerpt?: string | null
  id: number | string
  meta?: {
    description?: string | null
    image?: number | string | NoteMedia | null
    title?: string | null
  } | null
  publishedAt?: string | null
  slug: string
  title: string
  updatedAt: string
}

// Generated Payload types are not committed, so selected fields need an explicit shape.
export type ProjectCardDoc = {
  id: number | string
  title: string
  slug: string
  subtitle?: string
  featuredImage?: ResponsiveImageMedia
  client?: { tags?: string[] | null } | number | null
}

/** Card fields only; case-study pages load the full project by slug. */
export async function getProjects(options: GetProjectsOptions = {}) {
  const payload = await getPayload()
  const filters: Where[] = [
    ...(options.includeHidden ? [] : [{ hide: { not_equals: true } }]),
    ...(options.slugs ? [{ slug: { in: options.slugs } }] : []),
  ]

  const result = await payload.find({
    collection: 'projects',
    sort: 'order',
    pagination: false,
    where: filters.length ? { and: filters } : {},
    depth: 1,
    select: { title: true, slug: true, subtitle: true, featuredImage: true, client: true },
    // Only the client's tags, for filtering on /work.
    populate: { clients: { tags: true } },
  })
  return { ...result, docs: result.docs as unknown as ProjectCardDoc[] }
}

export const getProjectBySlug = cache(async function getProjectBySlug(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'projects',
    where: { slug: { equals: slug } },
    depth: 3,
    limit: 1,
  })
  return result.docs[0] || null
})

export const getProjectSlugs = cache(async function getProjectSlugs() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'projects',
    limit: 100,
    depth: 0,
    select: { slug: true },
  })
  return result.docs.flatMap((project) => project.slug ? [project.slug] : [])
})

export async function getSideProjects() {
  const payload = await getPayload()
  return payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 2 })
}

/** Titles and dates for lists, without note bodies, for every published note. */
export const getPublishedNoteList = cache(async function getPublishedNoteList() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'notes',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    pagination: false,
    depth: 0,
    draft: false,
    select: { title: true, slug: true, excerpt: true, publishedAt: true, createdAt: true, updatedAt: true },
  })

  return { ...result, docs: result.docs as unknown as PublishedNote[] }
})

export const getPublishedNotes = cache(async function getPublishedNotes() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'notes',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 100,
    depth: 1,
    draft: false,
  })

  return { ...result, docs: result.docs as unknown as PublishedNote[] }
})

export const getPublishedNoteBySlug = cache(async function getPublishedNoteBySlug(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'notes',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
      ],
    },
    depth: 2,
    limit: 1,
    draft: false,
  })

  return (result.docs[0] as unknown as PublishedNote | undefined) || null
})

// Social crawlers only need the title, not the full body or related media.
export async function getPublishedNoteTitleBySlug(slug: string): Promise<string | null> {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'notes',
    where: {
      and: [
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
      ],
    },
    select: { title: true },
    depth: 0,
    limit: 1,
    pagination: false,
    draft: false,
  })

  const title = result.docs[0]?.title
  return typeof title === 'string' && title.trim() ? title : null
}

export const getReadNextNotes = cache(async function getReadNextNotes(
  currentNoteId: string | number,
  publishedAt?: string | null,
) {
  const payload = await getPayload()
  const sharedFilters: Where[] = [
    { id: { not_equals: currentNoteId } },
    { _status: { equals: 'published' } },
  ]

  const recommendations: ReadNextNote[] = []

  if (publishedAt) {
    const olderResult = await payload.find({
      collection: 'notes',
      where: {
        and: [...sharedFilters, { publishedAt: { less_than: publishedAt } }],
      },
      sort: '-publishedAt',
      limit: 3,
      depth: 0,
      draft: false,
      select: { title: true, slug: true },
    })

    recommendations.push(...olderResult.docs as ReadNextNote[])
  }

  if (recommendations.length >= 3) return recommendations.slice(0, 3)

  const newestResult = await payload.find({
    collection: 'notes',
    where: { and: sharedFilters },
    sort: '-publishedAt',
    limit: 6,
    depth: 0,
    draft: false,
    select: { title: true, slug: true },
  })

  const seenSlugs = new Set(recommendations.map((note) => note.slug))
  for (const note of newestResult.docs as ReadNextNote[]) {
    if (seenSlugs.has(note.slug)) continue
    recommendations.push(note)
    seenSlugs.add(note.slug)
    if (recommendations.length >= 3) break
  }

  return recommendations
})

export const getPublishedNoteSlugs = cache(async function getPublishedNoteSlugs() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'notes',
    where: { _status: { equals: 'published' } },
    limit: 100,
    depth: 0,
    draft: false,
    select: { slug: true },
  })

  return result.docs.flatMap((note) => note.slug ? [note.slug] : [])
})

export const getSideProjectBySlug = cache(async function getSideProjectBySlug(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'side-projects',
    where: { slug: { equals: slug } },
    depth: 3,
    limit: 1,
  })
  return result.docs[0] || null
})

export const getSideProjectSlugs = cache(async function getSideProjectSlugs() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'side-projects',
    limit: 100,
    depth: 0,
    select: { slug: true },
  })
  return result.docs.flatMap((project) => project.slug ? [project.slug] : [])
})

export const getPageBySlug = cache(async function getPageBySlug(slug: string): Promise<PageQueryResult | null> {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return (result.docs[0] as unknown as PageQueryResult | undefined) || null
})

/** The homepage and its metadata share this read; hero slides need depth 3. */
export const getHomePage = cache(async function getHomePage() {
  const payload = await getPayload()
  return payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, depth: 3, limit: 1 })
})

/** Questions visitors asked at least twice, counted in the database instead of loading every chat. */
export const getRepeatedQuestions = cache(async function getRepeatedQuestions() {
  const payload = await getPayload()
  const result = await payload.db.drizzle.execute(sql`
    WITH "recent" AS (
      -- messages is an editable JSON field; skip rows that are not arrays.
      SELECT "messages" FROM "conversations"
      WHERE jsonb_typeof("messages"::jsonb) = 'array'
      ORDER BY "updated_at" DESC LIMIT 500
    ),
    "asked" AS (
      SELECT
        btrim("message"->>'content') AS "question",
        btrim(regexp_replace(regexp_replace(lower("message"->>'content'), '[^a-z0-9[:space:]]', '', 'g'), '[[:space:]]+', ' ', 'g')) AS "normalized"
      FROM "recent", jsonb_array_elements(COALESCE("recent"."messages", '[]'::jsonb)) AS "message"
      WHERE "message"->>'role' = 'user' AND "message"->>'content' !~* '@|https?://'
    )
    SELECT "normalized", (array_agg("question"))[1] AS "question", count(*)::int AS "count"
    FROM "asked"
    WHERE length("normalized") BETWEEN 8 AND 160
    GROUP BY "normalized"
    HAVING count(*) >= 2
    ORDER BY "count" DESC
    LIMIT 20
  `)
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows || []
  return rows as { normalized: string; question: string; count: number }[]
})

export const getPublishedPageBySlug = cache(async function getPublishedPageBySlug(slug: string): Promise<PageQueryResult | null> {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
    depth: 2,
  })
  return (result.docs[0] as unknown as PageQueryResult | undefined) || null
})

export const getNavigationPages = unstable_cache(async function getNavigationPages() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 100,
    pagination: false,
    select: {
      order: true,
      slug: true,
      title: true,
    },
    sort: 'order',
    where: {
      status: { equals: 'published' },
    },
  })

  const pages = sortPagesByOrder(result.docs as NavigationPageResult[]).flatMap((page) => {
    const url = getPagePath(page.slug)
    if (!url) return []

    return [
      {
        label: page.title || page.slug || 'Untitled page',
        url,
      },
    ]
  })

  return pages.length > 0 ? orderSiteNavigationItems(pages) : pages
}, ['navigation-pages'], { revalidate: 3600, tags: ['navigation-pages'] })

export const getSiteSettings = unstable_cache(async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
}, ['site-settings'], { revalidate: 3600, tags: ['site-settings'] })

export const getFooterSocialLinks = unstable_cache(async function getFooterSocialLinks() {
  const payload = await getPayload()
  const result = await payload.db.drizzle.execute(sql`
    SELECT link.platform::text AS platform, link.url
    FROM pages AS page
    INNER JOIN pages_blocks_social_links AS block
      ON block._parent_id = page.id
    INNER JOIN pages_blocks_social_links_links AS link
      ON link._parent_id = block.id
    WHERE page.slug = ${'home'}
    ORDER BY block._order ASC, link._order ASC
    LIMIT 8
  `)

  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)
      ? result.rows
      : []

  return rows.map((row) => {
    const value = row as Record<string, unknown>
    return {
      platform: typeof value.platform === 'string' ? value.platform : null,
      url: typeof value.url === 'string' ? value.url : null,
    } satisfies FooterSocialLink
  })
}, ['footer-social-links'], { revalidate: 3600, tags: ['footer-social-links'] })
