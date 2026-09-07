import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import sharp from 'sharp'
import { createNoteOpenGraphImage, NOTE_OG_SIZE, NOTE_OG_STYLE } from '../src/lib/noteOpenGraph'
import { buildPageMetadata } from '../src/lib/pageMetadata'
import { SITE_TAGLINE } from '../src/lib/siteMetadata'

test('note social images render valid 1200×630 PNGs with short, multiline, and long titles', async () => {
  for (const title of [
    'A quilt for generations',
    'I built a second brain out of markdown files',
    'Sensible Design: making ethically personalized digital products',
    'Tomorrow’s Mirage — effort, vision & creativity',
    'A new note published after the site was deployed',
  ]) {
    const response = await createNoteOpenGraphImage(title)
    assert.equal(response.headers.get('content-type'), 'image/png')
    const png = Buffer.from(await response.arrayBuffer())
    const metadata = await sharp(png).metadata()
    assert.equal(metadata.width, NOTE_OG_SIZE.width)
    assert.equal(metadata.height, NOTE_OG_SIZE.height)
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.deepEqual([...data.subarray(0, 3)], [0, 0, 0], 'black canvas')
    const titlePixels = data.subarray(info.width * 60 * 3, info.width * 456 * 3)
    const bylinePixels = data.subarray(info.width * 520 * 3, info.width * 575 * 3)
    assert.equal(Math.max(...new Set(titlePixels)), 255, 'fully opaque title')
    assert.equal(Math.max(...new Set(bylinePixels)), 153, '60% muted byline')
  }
})

test('social card typography uses the site heading family with an enlarged byline', async () => {
  const css = await readFile(new URL('../src/app/(frontend)/globals.css', import.meta.url), 'utf8')
  assert.ok(css.includes(`--font-heading: '${NOTE_OG_STYLE.fontFamily}'`))
  assert.ok(css.includes(`--text-h1: ${NOTE_OG_STYLE.titleSize}px`))
  assert.equal(NOTE_OG_STYLE.bylineSize, 64)
  assert.equal(NOTE_OG_STYLE.fontWeight, 400)
})

test('both social metadata formats use the custom image and its accessible description', () => {
  const url = 'https://www.gabrielvaldivia.com/notes/a-quilt-for-generations/og?v=2026-09-06'
  const alt = 'A quilt for generations — By Gabriel Valdivia'
  const metadata = buildPageMetadata({ meta: { image: { url, alt, ...NOTE_OG_SIZE } } }, {
    fallbackTitle: 'A quilt for generations',
    fallbackDescription: 'A handmade quilt passed through generations.',
  })
  assert.deepEqual(metadata.openGraph?.images, [{ url, alt, ...NOTE_OG_SIZE }])
  assert.deepEqual(metadata.twitter?.images, [{ url, alt }])
  assert.equal(metadata.title, 'A quilt for generations — Gabriel Valdivia')
})

test('the default metadata uses the new design partner tagline', () => {
  assert.equal(SITE_TAGLINE, 'Your design partner for first-generation products.')
})

test('new note slugs can render after deployment and have a dynamic image endpoint', async () => {
  const page = await readFile(new URL('../src/app/(frontend)/notes/[slug]/page.tsx', import.meta.url), 'utf8')
  const route = await readFile(new URL('../src/app/(frontend)/notes/[slug]/og/route.tsx', import.meta.url), 'utf8')
  assert.match(page, /export const dynamicParams = true/)
  assert.match(route, /getPublishedNoteTitleBySlug\(slug\)/)
  assert.match(route, /createNoteOpenGraphImage\(title\)/)
  assert.doesNotMatch(route, /generateStaticParams|dynamicParams = false/)
})
