import { getPayload } from './payload'

export async function getProjects(featured?: boolean) {
  const payload = await getPayload()
  return payload.find({
    collection: 'projects',
    sort: 'order',
    limit: 100,
    where: featured ? { featured: { equals: true } } : {},
    depth: 2,
  })
}

export async function getProjectBySlug(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'projects',
    where: { slug: { equals: slug } },
    depth: 3,
    limit: 1,
  })
  return result.docs[0] || null
}

export async function getClients() {
  const payload = await getPayload()
  return payload.find({ collection: 'clients', sort: 'order', limit: 100, depth: 1 })
}

export async function getSideProjects() {
  const payload = await getPayload()
  return payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 2 })
}

export async function getSideProjectBySlug(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'side-projects',
    where: { slug: { equals: slug } },
    depth: 3,
    limit: 1,
  })
  return result.docs[0] || null
}

export async function getFeaturedTestimonials() {
  const payload = await getPayload()
  return payload.find({
    collection: 'people',
    where: { featuredTestimonial: { equals: true } },
    limit: 20,
    depth: 1,
  })
}

export async function getPageBySlug(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })
  return result.docs[0] || null
}

export async function getNavigation() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'navigation' })
}

export async function getSiteSettings() {
  const payload = await getPayload()
  return payload.findGlobal({ slug: 'site-settings' })
}
