import { cache } from 'react'
import type { Where } from 'payload'
import { getPayload } from './payload'
import type { PageLike } from './pageMetadata'
import { getPagePath, sortPagesByOrder, type OrderedPage } from './pageOrdering'

type GetProjectsOptions = {
  includeHidden?: boolean
}

type PageQueryResult = PageLike & {
  title: string
  content?: unknown
  [key: string]: unknown
}

type NavigationPageResult = OrderedPage & {
  status?: string | null
}

export async function getProjects(options: GetProjectsOptions = {}) {
  const payload = await getPayload()
  const filters = []

  if (!options.includeHidden) {
    filters.push({ hide: { not_equals: true } })
  }

  return payload.find({
    collection: 'projects',
    sort: 'order',
    limit: 100,
    where: filters.length > 1 ? { and: filters } : filters[0] || {},
    depth: 2,
  })
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

export async function getClients() {
  const payload = await getPayload()
  return payload.find({ collection: 'clients', limit: 100, depth: 1 })
}

export async function getSideProjects() {
  const payload = await getPayload()
  return payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 2 })
}

export const getPublishedNotes = cache(async function getPublishedNotes() {
  const payload = await getPayload()
  return payload.find({
    collection: 'notes',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 100,
    depth: 1,
    draft: false,
  })
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

  return result.docs[0] || null
})

export const getReadNextNote = cache(async function getReadNextNote(
  currentNoteId: string | number,
  publishedAt?: string | null,
) {
  const payload = await getPayload()
  const sharedFilters: Where[] = [
    { id: { not_equals: currentNoteId } },
    { _status: { equals: 'published' } },
  ]

  if (publishedAt) {
    const olderResult = await payload.find({
      collection: 'notes',
      where: {
        and: [...sharedFilters, { publishedAt: { less_than: publishedAt } }],
      },
      sort: '-publishedAt',
      limit: 1,
      depth: 0,
      draft: false,
      select: { title: true, slug: true, excerpt: true },
    })

    if (olderResult.docs[0]) return olderResult.docs[0]
  }

  const newestResult = await payload.find({
    collection: 'notes',
    where: { and: sharedFilters },
    sort: '-publishedAt',
    limit: 1,
    depth: 0,
    draft: false,
    select: { title: true, slug: true, excerpt: true },
  })

  return newestResult.docs[0] || null
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

export async function getFeaturedTestimonials() {
  const payload = await getPayload()
  return payload.find({
    collection: 'people',
    where: { featuredTestimonial: { equals: true } },
    limit: 20,
    depth: 2,
  })
}

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

export const getNavigationPages = cache(async function getNavigationPages() {
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

  if (pages.length > 0 && !pages.some((page) => page.url === '/notes')) {
    pages.push({ label: 'Notes', url: '/notes' })
  }

  return pages
})

export const getSiteSettings = cache(async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
})
