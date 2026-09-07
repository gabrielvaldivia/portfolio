// Preview: payload run scripts/update-site-metadata.ts
// Apply only the three reviewed metadata fields: add -- --write.
import config from '@payload-config'
import { getPayload } from 'payload'
import { SITE_TAGLINE } from '../src/lib/siteMetadata'

const payload = await getPayload({ config })
const write = process.argv.includes('--write')
const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
const pages = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, depth: 0, limit: 1 })
const home = pages.docs[0]
if (!home) throw new Error('Homepage not found')

const oldTagline = 'Fractional Design Partner for Early-Stage Teams'
const oldDescription = 'Design partner for early-stage teams, helping founders turn loose ideas into sharper product strategy, faster prototypes, and stronger design foundations.'
const fields = [
  { field: 'site-settings.siteDescription', current: settings.siteDescription, previous: oldTagline },
  { field: 'home.meta.title', current: home.meta?.title, previous: oldTagline },
  { field: 'home.meta.description', current: home.meta?.description, previous: oldDescription },
]
for (const field of fields) {
  if (field.current !== field.previous && field.current !== SITE_TAGLINE) {
    throw new Error(`${field.field} has changed; inspect before updating it`)
  }
}
if (write) {
  if (settings.siteDescription !== SITE_TAGLINE) {
    await payload.updateGlobal({ slug: 'site-settings', data: { siteDescription: SITE_TAGLINE } })
  }
  if (home.meta?.title !== SITE_TAGLINE || home.meta?.description !== SITE_TAGLINE) {
    await payload.update({
      collection: 'pages',
      id: home.id,
      data: { meta: { ...home.meta, title: SITE_TAGLINE, description: SITE_TAGLINE } },
    })
  }
}
console.log(JSON.stringify({ write, fields: fields.map(({ field, current }) => ({ field, before: current, after: SITE_TAGLINE })) }, null, 2))
await payload.destroy()
