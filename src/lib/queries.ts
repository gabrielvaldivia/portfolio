import { cache } from 'react'
import { getPayload } from './payload'
import type { Page } from '@/payload-types'

type GetProjectsOptions = {
  includeHidden?: boolean
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

export const getPageBySlug = cache(async function getPageBySlug(slug: string): Promise<Page | null> {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return (result.docs[0] as Page | undefined) || null
})

export const getPublishedPageBySlug = cache(async function getPublishedPageBySlug(slug: string): Promise<Page | null> {
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
  return (result.docs[0] as Page | undefined) || null
})

export const getSiteSettings = cache(async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
})
