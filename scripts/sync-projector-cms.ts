// Replaces Projector's Playground screenshots with captures of the live app's Demo workspace.
// Media is uploaded through the Payload local API, so images get the usual resized versions.
// Only the page's modules change; its title, description, and links stay as edited in the CMS.
// Usage: npx payload run scripts/sync-projector-cms.ts -- <assetDir>
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

const assetDir = path.resolve(process.argv[process.argv.length - 1] || '')
const address = 'projector.design'

const assets = {
  income: { filename: 'projector-income.jpg', alt: 'Projector’s income view: year-to-date total, estimated net profit, a monthly chart of pay, costs, and net income, and each month’s clients' },
  schedule: { filename: 'projector-schedule.jpg', alt: 'Projector’s schedule: each team member’s contracts as bars on a day-by-day timeline' },
  contracts: { filename: 'projector-contracts.jpg', alt: 'Projector’s contracts list with each contract’s client, designer, and status' },
  clients: { filename: 'projector-clients.jpg', alt: 'Projector’s clients list with the designers on each account, how long they’ve been a client, and status' },
} as const

type AssetKey = keyof typeof assets

for (const asset of Object.values(assets)) {
  if (!fs.existsSync(path.join(assetDir, asset.filename))) {
    console.error(`Missing ${asset.filename} in ${assetDir}`)
    console.error('Usage: npx payload run scripts/sync-projector-cms.ts -- <assetDir>')
    process.exit(1)
  }
}

const payload = await getPayload({ config })

/** Uploads a file once; reruns keep the existing upload and refresh its alt text. */
async function upsertMedia(key: AssetKey) {
  const asset = assets[key]
  const existing = await payload.find({ collection: 'media', where: { filename: { equals: asset.filename } }, limit: 1, depth: 0 })
  if (existing.docs[0]) {
    await payload.update({ collection: 'media', id: existing.docs[0].id, data: { alt: asset.alt } })
    return existing.docs[0].id
  }
  const created = await payload.create({ collection: 'media', data: { alt: asset.alt }, filePath: path.join(assetDir, asset.filename) })
  return created.id
}

const media = {} as Record<AssetKey, number>
for (const key of Object.keys(assets) as AssetKey[]) {
  media[key] = await upsertMedia(key) as number
  console.log(`media ${key}: ${media[key]}`)
}

const browser = (id: string, image: number, caption: string, columns: '3' | '6' = '3') => ({
  blockType: 'browser' as const, id, image, address, caption,
  columns, rows: 'wrap' as const, fit: 'cover' as const, padding: '0' as const, bgColor: 'alt', imageBorder: false, shadow: false,
})

const content = [
  browser('projector-income', media.income, 'Income tracks pay, costs, and net income month by month, with the clients behind each.', '6'),
  browser('projector-schedule', media.schedule, 'The schedule lays out who’s working on what, day by day.', '6'),
  browser('projector-contracts', media.contracts, 'Every contract with its client, designer, and status.'),
  browser('projector-clients', media.clients, 'Clients, the designers on each account, and how long they’ve been around.'),
]

const existing = await payload.find({ collection: 'side-projects', where: { slug: { equals: 'projector' } }, limit: 1, depth: 0 })
if (!existing.docs[0]) {
  console.error('No Playground project with the slug "projector"')
  process.exit(1)
}
const project = await payload.update({ collection: 'side-projects', id: existing.docs[0].id, data: { content } as any })

console.log(JSON.stringify({ sideProject: project.id, slug: project.slug, media, blocks: content.map((block) => `${block.blockType}:${block.id}`) }, null, 2))
process.exit(0)
