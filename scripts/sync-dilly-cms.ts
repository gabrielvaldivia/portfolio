// Adds Dilly to the Playground, or updates it, with its screen recordings and screenshots.
// Media is uploaded through the Payload local API, so images get the usual resized versions.
// The files stay out of this repo: they show real players' portraits from the live app.
// Usage: npx payload run scripts/sync-dilly-cms.ts -- <assetDir>
import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

const assetDir = path.resolve(process.argv[process.argv.length - 1] || '')
const address = 'dilly.vercel.app'

const assets = {
  desktopFlow: { filename: 'dilly-desktop-flow.mp4', alt: 'A full game of Dilly on desktop: picking fighters on the globe, the versus splash, scoring to deuce, holding + to win, the K.O. screen, and the rivalry records', width: 1920, height: 1200 },
  mobileSelect: { filename: 'dilly-mobile-select.mp4', alt: 'Spinning the fighter globe and swapping fighters on iPhone, then the versus splash', width: 786, height: 1704 },
  mobileScore: { filename: 'dilly-mobile-score.mp4', alt: 'Scoring a Dilly game on iPhone: a point run, ruler drags, game point, deuce, and holding + to jump to the winning score', width: 786, height: 1704 },
  mobileKO: { filename: 'dilly-mobile-ko.mp4', alt: 'Saving the game on iPhone: the K.O. screen with the loser’s beaten-up portrait, then the rivalry records', width: 786, height: 1704 },
  desktopSelect: { filename: 'dilly-desktop-select.jpg', alt: 'Dilly’s fighter select: 1P and 2P portraits on either side of a globe of fighters' },
  desktopVersus: { filename: 'dilly-desktop-versus.jpg', alt: 'The versus splash before a game, with both fighters’ portraits' },
  desktopDeuce: { filename: 'dilly-desktop-match-deuce.jpg', alt: 'A game tied at 10–10, with DEUCE! called out above the scores' },
  desktopKO: { filename: 'dilly-desktop-ko.jpg', alt: 'The K.O. screen: the winner, the score, a streak-breaker callout, and the loser’s beaten-up portrait with an excuse' },
  desktopRivalries: { filename: 'dilly-desktop-rivalries.jpg', alt: 'A rivalry’s head-to-head record, best streak, average margin, the race, and every winning margin' },
  iphoneKOCall: { filename: 'dilly-iphone-match-ko.jpg', alt: 'A won game on iPhone, with the K.O. callout and a lit SAVE button' },
  iphoneKO: { filename: 'dilly-iphone-ko.jpg', alt: 'The K.O. screen on iPhone' },
  iphoneRecords: { filename: 'dilly-iphone-records.jpg', alt: 'Records on iPhone: every fighter ranked by wins' },
} as const

type AssetKey = keyof typeof assets

// Earlier uploads that were replaced; removed once nothing links to them.
const superseded = ['dilly-desktop-records.jpg', 'dilly-iphone-rivalries.jpg']

const paragraph = (text: string) => ({
  type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '',
  children: [{ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 }],
})

const richDescription = {
  root: {
    type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
    children: [
      paragraph('Dilly keeps score for pickleball like an arcade fighting game. Every player is a fighter with an AI-stylized portrait, picked from a spinning globe before each game. Points land like hits, with sparks, point runs, and game point and deuce called out, and holding + jumps straight to the winning score.'),
      paragraph('Saving a game brings up a K.O. screen with a beaten-up version of the loser’s portrait and an excuse to match. Records keep the rankings, every rivalry, and the full history.'),
    ],
  },
}

for (const asset of Object.values(assets)) {
  if (!fs.existsSync(path.join(assetDir, asset.filename))) {
    console.error(`Missing ${asset.filename} in ${assetDir}`)
    console.error('Usage: npx payload run scripts/sync-dilly-cms.ts -- <assetDir>')
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
  // Payload reads dimensions from images only; the videos' keep the lightbox at their shape.
  if ('width' in asset) await payload.update({ collection: 'media', id: created.id, data: dimensions })
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
// Dilly is dark, so its screens carry their own white status bar.
const iphoneVideo = (id: string, video: number) => ({
  blockType: 'iphone15' as const, id, video, columns: '2' as const, rows: 'wrap' as const, showNotch: true, showStatusBar: false,
})
const iphoneImage = (id: string, image: number) => ({
  blockType: 'iphone15' as const, id, image, columns: '2' as const, rows: 'wrap' as const, showNotch: true, showStatusBar: false,
})

const data = {
  title: 'Dilly',
  slug: 'dilly',
  order: 0,
  year: '2026',
  description: 'Pickleball scorekeeping, arcade fighter style',
  richDescription,
  featuredImage: media.desktopSelect,
  links: [{ label: 'Visit website', url: 'https://dilly.vercel.app' }],
  content: [
    browser('dilly-select', media.desktopSelect, 'Fighters sit on a spinning globe; tap one to put them in 1P or 2P.', '6'),
    {
      blockType: 'video' as const, id: 'dilly-desktop-flow', video: media.desktopFlow,
      caption: 'A full game: pick two fighters, score it to deuce, hold + to win, and take the K.O.',
      columns: '6' as const, rows: 'wrap' as const, fit: 'contain' as const, padding: '40' as const, bgColor: 'alt', border: false,
      autoplay: true, loop: true, muted: true, controls: false,
    },
    iphoneVideo('dilly-iphone-select', media.mobileSelect),
    iphoneVideo('dilly-iphone-score', media.mobileScore),
    iphoneVideo('dilly-iphone-ko', media.mobileKO),
    browser('dilly-versus', media.desktopVersus, 'Every game opens with a versus splash.'),
    browser('dilly-deuce', media.desktopDeuce, 'Points land like hits, and game point and deuce get called out.'),
    iphoneImage('dilly-iphone-ko-call', media.iphoneKOCall),
    iphoneImage('dilly-iphone-ko-screen', media.iphoneKO),
    iphoneImage('dilly-iphone-records', media.iphoneRecords),
    browser('dilly-ko', media.desktopKO, 'The loser gets a beaten-up portrait and an excuse to go with it.'),
    browser('dilly-rivalries', media.desktopRivalries, 'Each rivalry tracks the head-to-head, streaks, margins, and the race.'),
  ],
}

const existing = await payload.find({ collection: 'side-projects', where: { slug: { equals: 'dilly' } }, limit: 1, depth: 0 })
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
