// Preview: payload run scripts/sync-page-content.ts
// Apply: append -- --write --home-updated-at <timestamp> --about-updated-at <timestamp>.
// The timestamps must match the preview. Original pages are backed up before any writes.
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import config from '@payload-config'
import { getPayload } from 'payload'
import { getSyncedPageContent } from './lib/pageContentSync'

const payload = await getPayload({ config })
const write = process.argv.includes('--write')
const argument = (name: string) => process.argv[process.argv.indexOf(name) + 1]

try {
  const result = await payload.find({ collection: 'pages', where: { slug: { in: ['home', 'about'] } }, depth: 0, limit: 2 })
  const home = result.docs.find((page) => page.slug === 'home')!
  const about = result.docs.find((page) => page.slug === 'about')!
  assert(home && about, 'Home and About must exist')

  if (write) {
    assert.equal(home.updatedAt, argument('--home-updated-at'), 'Home changed since the reviewed preview')
    assert.equal(about.updatedAt, argument('--about-updated-at'), 'About changed since the reviewed preview')
    const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-page-content-'))
    await writeFile(path.join(directory, 'before.json'), JSON.stringify({ home, about }, null, 2))
    console.log(`Original page backup: ${directory}/before.json`)
  }

  const portraitId = async (filename: string, alt: string) => {
    const existing = await payload.find({ collection: 'media', where: { filename: { equals: filename } }, depth: 0, limit: 1 })
    if (existing.docs[0]) return existing.docs[0].id
    if (!write) return 0
    const media = await payload.create({ collection: 'media', data: { alt }, filePath: path.resolve('public/images', filename) })
    return media.id
  }
  const light = await portraitId('about-portrait.jpg', 'Portrait of Gabriel Valdivia')
  const dark = await portraitId('about-portrait-dark.webp', 'Portrait of Gabriel Valdivia in warm light')
  const updates = getSyncedPageContent(home, about, { light, dark })
  console.log(JSON.stringify({
    write, homeUpdatedAt: home.updatedAt, aboutUpdatedAt: about.updatedAt,
    portraits: { light: light || 'Upload current light portrait', dark: dark || 'Upload current dark portrait' },
    homeSections: updates.home.sections.map((section: any) => ({ type: section.blockType, heading: section.heading || section.title, name: section.blockName })),
    aboutSections: updates.about.aboutSections.map((section: any) => ({ type: section.blockType, heading: section.title })),
  }, null, 2))

  if (write) {
    for (const [page, data] of [[home, updates.home], [about, updates.about]] as const) {
      const result = await payload.update({
        collection: 'pages',
        where: { and: [{ id: { equals: page.id } }, { updatedAt: { equals: page.updatedAt } }] },
        data,
        depth: 0,
      })
      assert.equal(result.errors.length, 0, JSON.stringify(result.errors))
      assert.equal(result.docs.length, 1, `${page.slug} changed while syncing; stop and inspect`)
      const saved = await payload.findByID({ collection: 'pages', id: page.id, depth: 0 })
      const key = page.slug === 'home' ? 'sections' : 'aboutSections'
      assert.deepEqual(saved[key], result.docs[0][key], `${page.slug} did not persist`)
      console.log(`Verified saved ${page.slug} content (${saved.updatedAt})`)
    }
  }
} finally {
  await payload.destroy()
}
