/**
 * Creates the web copies of gallery photos that are missing them.
 * Run with: npx tsx --env-file=.env.local scripts/generate-photo-renditions.ts [--force]
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createPhotoRenditions, hasPhotoRenditions } from '../src/lib/photoRenditions'

const force = process.argv.includes('--force')
const payload = await getPayload({ config })
// The URL needs the storage prefix, which select would otherwise drop.
const { docs } = await payload.find({ collection: 'photos', pagination: false, depth: 0, select: { filename: true, url: true, prefix: true } })
let created = 0
for (const photo of docs as { filename?: string | null; url?: string | null }[]) {
  if (!photo.filename || !photo.url) continue
  if (!force && await hasPhotoRenditions(photo.filename)) continue
  const response = await fetch(photo.url)
  if (!response.ok) {
    console.warn(`Skipped ${photo.filename}: ${photo.url} returned ${response.status}`)
    continue
  }
  await createPhotoRenditions(Buffer.from(await response.arrayBuffer()), photo.filename)
  created++
  console.log(`Created web copies for ${photo.filename}`)
}
console.log(`Done: ${created} of ${docs.length} photos needed web copies.`)
process.exit(0)
