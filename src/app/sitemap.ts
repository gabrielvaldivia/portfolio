import type { MetadataRoute } from 'next'
import { getPayload } from '@/lib/payload'
import { getSiteSettings } from '@/lib/queries'
import { getPagePath } from '@/lib/pageOrdering'
import { SITE_ORIGIN } from '@/lib/siteMetadata'

export const revalidate = 3600

type SitemapEntry = MetadataRoute.Sitemap[number]

const STATIC_ROUTES: Array<{
  path: string
  changeFrequency: SitemapEntry['changeFrequency']
  priority: number
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/work', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/playground', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/notes', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/clients', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/people', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/photos', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/timeline', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/activity', changeFrequency: 'daily', priority: 0.4 },
]

function getLastModified(value: unknown) {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload()
  const [settings, pages, projects, sideProjects, notes, photos] = await Promise.all([
    getSiteSettings(),
    payload.find({
      collection: 'pages',
      where: { status: { equals: 'published' } },
      limit: 100,
      pagination: false,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'projects',
      where: { hide: { not_equals: true } },
      limit: 100,
      pagination: false,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'side-projects',
      limit: 100,
      pagination: false,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'notes',
      where: { _status: { equals: 'published' } },
      limit: 100,
      pagination: false,
      depth: 0,
      draft: false,
      select: { slug: true, updatedAt: true },
    }),
    payload.find({
      collection: 'photos',
      limit: 500,
      pagination: false,
      depth: 0,
      select: { slug: true, updatedAt: true },
    }),
  ])

  const configuredOrigin = (settings as { canonicalUrl?: string | null }).canonicalUrl
  const origin = (configuredOrigin || SITE_ORIGIN).replace(/\/$/, '')
  const entries = new Map<string, SitemapEntry>()

  const addEntry = (path: string, entry: Omit<SitemapEntry, 'url'>) => {
    const url = new URL(path, `${origin}/`).toString()
    const existing = entries.get(url)
    entries.set(url, existing ? { ...existing, ...entry, url } : { ...entry, url })
  }

  for (const route of STATIC_ROUTES) {
    addEntry(route.path, {
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })
  }

  for (const page of pages.docs) {
    const slug = typeof page.slug === 'string' ? page.slug : undefined
    const path = getPagePath(slug)
    if (path) addEntry(path, { lastModified: getLastModified(page.updatedAt) })
  }

  for (const project of projects.docs) {
    const slug = typeof project.slug === 'string' ? project.slug : undefined
    if (slug) {
      addEntry(`/work/${encodeURIComponent(slug)}`, {
        changeFrequency: 'monthly',
        lastModified: getLastModified(project.updatedAt),
        priority: 0.7,
      })
    }
  }

  for (const project of sideProjects.docs) {
    const slug = typeof project.slug === 'string' ? project.slug : undefined
    if (slug) {
      addEntry(`/playground/${encodeURIComponent(slug)}`, {
        changeFrequency: 'monthly',
        lastModified: getLastModified(project.updatedAt),
        priority: 0.6,
      })
    }
  }

  for (const note of notes.docs) {
    const slug = typeof note.slug === 'string' ? note.slug : undefined
    if (slug) {
      addEntry(`/notes/${encodeURIComponent(slug)}`, {
        changeFrequency: 'monthly',
        lastModified: getLastModified(note.updatedAt),
        priority: 0.6,
      })
    }
  }

  for (const photo of photos.docs) {
    const slug = typeof photo.slug === 'string' ? photo.slug : undefined
    if (slug) {
      addEntry(`/photos/${encodeURIComponent(slug)}`, {
        changeFrequency: 'yearly',
        lastModified: getLastModified(photo.updatedAt),
        priority: 0.4,
      })
    }
  }

  return [...entries.values()]
}
