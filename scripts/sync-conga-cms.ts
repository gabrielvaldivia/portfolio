// Adds Conga to the Playground, or updates it, with its promo video and screenshots.
// Media is uploaded through the Payload local API, so images get the usual resized versions.
// The files stay out of this repo: the promo's music is licensed for use in the video only.
// Usage: npx payload run scripts/sync-conga-cms.ts -- <assetDir>
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

const assetDir = path.resolve(process.argv[process.argv.length - 1] || '')
const address = 'conga.video'

const assets = {
  promo: { filename: 'conga-promo-square.mp4', alt: 'Conga promo: recording a message, sharing the link, collecting everyone’s clips, and delivering them on the day', width: 1080, height: 1080 },
  guestFan: { filename: 'conga-guest-fan.jpg', alt: 'A Conga in progress: five messages as cards, a countdown to when recording closes, and email invites' },
  organizer: { filename: 'conga-organizer.png', alt: 'The organizer’s page for a Conga, with the delivery date and the messages in playback order' },
  iphoneRecording: { filename: 'conga-iphone-recording.jpg', alt: 'Recording a message for a Conga on iPhone' },
  iphoneGuest: { filename: 'conga-iphone-guest.jpg', alt: 'A Conga’s messages as cards, with email invites, on iPhone' },
  iphoneWatch: { filename: 'conga-iphone-watch.jpg', alt: 'The recipient watching their Conga on iPhone, one message after another' },
} as const

type AssetKey = keyof typeof assets

// Earlier uploads that were replaced; removed once nothing links to them.
const superseded = ['conga-guest-cards.jpg', 'conga-iphone-record.jpg']

const paragraph = (text: string) => ({
  type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '',
  children: [{ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 }],
})

const richDescription = {
  root: {
    type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
    children: [
      paragraph('Conga turns messages from friends and family into one video gift. You record a message and share a link, and everyone else adds theirs from their phone, with no app or account. Conga collects the clips and emails them to the recipient on their special day, who can watch every message back to back and reply with one of their own.'),
    ],
  },
}

for (const asset of Object.values(assets)) {
  if (!fs.existsSync(path.join(assetDir, asset.filename))) {
    console.error(`Missing ${asset.filename} in ${assetDir}`)
    console.error('Usage: npx payload run scripts/sync-conga-cms.ts -- <assetDir>')
    process.exit(1)
  }
}

const payload = await getPayload({ config })

/** Uploads a file once; reruns keep the existing upload and refresh its alt text. */
async function upsertMedia(key: AssetKey) {
  const asset = assets[key]
  const dimensions = 'width' in asset ? { width: asset.width, height: asset.height } : {}
  const existing = await payload.find({ collection: 'media', where: { filename: { equals: asset.filename } }, limit: 1, depth: 0 })
  if (existing.docs[0]) {
    await payload.update({ collection: 'media', id: existing.docs[0].id, data: { alt: asset.alt, ...dimensions } })
    return existing.docs[0].id
  }
  const created = await payload.create({ collection: 'media', data: { alt: asset.alt }, filePath: path.join(assetDir, asset.filename) })
  // Payload reads dimensions from images only; the video's let the lightbox keep it square.
  if ('width' in asset) await payload.update({ collection: 'media', id: created.id, data: dimensions })
  return created.id
}

const media = {} as Record<AssetKey, number>
for (const key of Object.keys(assets) as AssetKey[]) {
  media[key] = await upsertMedia(key) as number
  console.log(`media ${key}: ${media[key]}`)
}

const browser = (id: string, image: number, caption: string) => ({
  blockType: 'browser' as const, id, image, address, caption,
  columns: '3' as const, rows: 'wrap' as const, fit: 'cover' as const, padding: '0' as const, bgColor: 'alt', imageBorder: false, shadow: false,
})
const iphone = (id: string, image: number, showStatusBar: boolean) => ({
  blockType: 'iphone15' as const, id, image, columns: '2' as const, rows: 'wrap' as const, showNotch: true,
  // The recording and watch screens are dark, so they carry their own white status bar.
  showStatusBar,
})

const data = {
  title: 'Conga',
  slug: 'conga',
  order: 0,
  year: '2026',
  description: 'A video gift from your loved ones',
  richDescription,
  featuredImage: media.guestFan,
  links: [{ label: 'Visit website', url: 'https://conga.video' }],
  content: [
    {
      blockType: 'video' as const, id: 'conga-promo', video: media.promo,
      caption: 'A Conga in six steps, from the first message to the recipient’s reaction.',
      // The square video sits in a wide band of its own background color.
      columns: '6' as const, rows: '3' as const, fit: 'contain' as const, padding: '0' as const, bgColor: '#FCFBFE', border: false,
      autoplay: true, loop: true, muted: true, controls: true,
    },
    browser('conga-guest-cards', media.guestFan, 'Each message joins a row of cards, with a countdown to when recording closes.'),
    browser('conga-organizer', media.organizer, 'The organizer sets the delivery date and drags messages into playback order.'),
    iphone('conga-iphone-record', media.iphoneRecording, false),
    iphone('conga-iphone-guest', media.iphoneGuest, true),
    iphone('conga-iphone-watch', media.iphoneWatch, false),
  ],
}

const existing = await payload.find({ collection: 'side-projects', where: { slug: { equals: 'conga' } }, limit: 1, depth: 0 })
const project = existing.docs[0]
  ? await payload.update({ collection: 'side-projects', id: existing.docs[0].id, data: data as any })
  : await payload.create({ collection: 'side-projects', data: data as any })

const removed: string[] = []
for (const filename of superseded) {
  const old = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, limit: 1, depth: 0 })
  if (!old.docs[0] || Object.values(media).includes(old.docs[0].id as number)) continue
  // Deleting the media record also deletes its files from storage.
  await payload.delete({ collection: 'media', id: old.docs[0].id })
  removed.push(filename)
}

console.log(JSON.stringify({ sideProject: project.id, slug: project.slug, media, removed, blocks: data.content.map((block) => `${block.blockType}:${block.id}`) }, null, 2))
process.exit(0)
