// Adds the stageshow mobile tour to Dilly's Playground page without touching its other modules,
// for when the rest of sync-dilly-cms.ts's assets aren't at hand. The tour goes after the desktop flow.
// Usage: npx payload run scripts/add-dilly-mobile-tour.ts -- <path/to/dilly-mobile-tour.mp4>
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

const filePath = path.resolve(process.argv[process.argv.length - 1] || '')
const filename = 'dilly-mobile-tour.mp4'
if (path.basename(filePath) !== filename || !fs.existsSync(filePath)) {
  console.error(`Usage: npx payload run scripts/add-dilly-mobile-tour.ts -- <path/to/${filename}>`)
  process.exit(1)
}

const alt = 'A tour of Dilly on iPhone: picking Leah for 2P, the versus splash, a point run, holding + to jump to the winning score, the K.O. screen with the loser’s beaten-up portrait and excuse, then Records'
const dimensions = { width: 900, height: 1230 }

const payload = await getPayload({ config })

const found = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, depth: 0 })
let mediaId = found.docs[0]?.id
if (mediaId) {
  // Reruns replace the upload with the given file, so a re-recorded tour goes live
  await payload.update({ collection: 'media', id: mediaId, data: { alt, ...dimensions }, filePath, overwriteExistingFiles: true })
} else {
  const created = await payload.create({ collection: 'media', data: { alt }, filePath })
  // Payload reads dimensions from images only; the video's keep its frame in proportion.
  await payload.update({ collection: 'media', id: created.id, data: dimensions })
  mediaId = created.id
}

const block = {
  blockType: 'video', id: 'dilly-mobile-tour', video: mediaId,
  caption: 'A whole game on iPhone: pick a fighter, score it, hold + to win, and take the K.O.',
  columns: '6', rows: '3', fit: 'contain', padding: '0', bgColor: '#06050E', border: false,
  autoplay: true, loop: true, muted: true, controls: false,
}

const existing = await payload.find({ collection: 'side-projects', where: { slug: { equals: 'dilly' } }, limit: 1, depth: 0 })
const project = existing.docs[0]
if (!project) {
  console.error('No Playground project with the slug "dilly"')
  process.exit(1)
}
const content = ((project.content || []) as any[]).filter((b) => b.id !== block.id)
const after = content.findIndex((b) => b.id === 'dilly-desktop-flow')
content.splice(after >= 0 ? after + 1 : content.length, 0, block)
await payload.update({ collection: 'side-projects', id: project.id, data: { content } as any })

console.log(JSON.stringify({ sideProject: project.id, media: mediaId, blocks: content.map((b) => `${b.blockType}:${b.id}`) }, null, 2))
process.exit(0)
