// Upload a photo into the Photos collection via the Payload local API.
// EXIF, capture date, slug, and the web rendition are handled by the
// collection's hooks. Usage: npx payload run scripts/upload-photo.ts -- <file>
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

const filePath = process.argv[process.argv.length - 1]
if (!filePath || filePath.endsWith('.ts')) {
  console.error('Usage: npx payload run scripts/upload-photo.ts -- <file>')
  process.exit(1)
}

const payload = await getPayload({ config })
const filename = path.basename(filePath)
const slug = filename.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const existing = await payload.find({
  collection: 'photos',
  where: { slug: { equals: slug } },
  limit: 1,
})
if (existing.totalDocs > 0) {
  console.log(`Photo with slug "${slug}" already exists (id ${existing.docs[0].id}) — skipping`)
  process.exit(0)
}

const doc = await payload.create({
  collection: 'photos',
  data: {},
  filePath: path.resolve(filePath),
})
console.log(JSON.stringify({ id: doc.id, slug: doc.slug, captureDate: doc.captureDate, exif: doc.exif, url: doc.url, web: doc.sizes?.web?.url }, null, 2))
process.exit(0)
