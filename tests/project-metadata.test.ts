import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProjectMetadata, firstContentImage, projectShareImage } from '../src/lib/projectMetadata'

const hero = {
  url: '/media/hero.png',
  mimeType: 'image/png',
  width: 2400,
  height: 1600,
  sizes: { og: { url: '/media/hero-1200x630.png', width: 1200, height: 630 } },
}

test('uses the first content image, skipping text, videos and SVGs', () => {
  const image = firstContentImage([
    { blockType: 'text', content: {} },
    { blockType: 'video', video: { url: '/media/clip.mp4', mimeType: 'video/mp4' } },
    { blockType: 'image', image: { url: '/media/logo.svg', mimeType: 'image/svg+xml' } },
    { blockType: 'image', image: hero },
    { blockType: 'image', image: { url: '/media/second.png', mimeType: 'image/png' } },
  ])

  assert.deepEqual(image, { url: '/media/hero-1200x630.png', width: 1200, height: 630 })
})

test('falls back to the original upload when no og crop exists', () => {
  assert.deepEqual(
    firstContentImage([{ blockType: 'browser', image: { url: '/media/small.png', mimeType: 'image/png', width: 800, height: 500, sizes: { og: { url: null } } } }]),
    { url: '/media/small.png', width: 800, height: 500 },
  )
})

test('prefers an explicit SEO image, then the hero, then the featured image', () => {
  const featuredImage = { url: '/media/thumb.png', mimeType: 'image/png' }
  const content = [{ blockType: 'image', image: hero }]

  assert.equal(projectShareImage({ meta: { image: { url: '/media/seo.png' } }, content, featuredImage })?.url, '/media/seo.png')
  assert.equal(projectShareImage({ content, featuredImage })?.url, '/media/hero-1200x630.png')
  assert.equal(projectShareImage({ content: [], featuredImage })?.url, '/media/thumb.png')
  assert.equal(projectShareImage({ content: [{ blockType: 'image', image: 42 }] }), undefined)
})

test('builds share metadata titled after the project with its hero image', () => {
  const metadata = buildProjectMetadata(
    { title: 'Kale', subtitle: 'A calmer tablet', content: [{ blockType: 'image', image: hero }] },
    { canonicalPath: '/work/kale', markdownPath: '/work/kale/index.md' },
  )

  assert.equal(metadata.title, 'Kale — Gabriel Valdivia')
  assert.equal(metadata.description, 'A calmer tablet')
  assert.deepEqual(metadata.openGraph, {
    type: 'article',
    title: 'Kale',
    description: 'A calmer tablet',
    url: '/work/kale',
    images: [{ url: '/media/hero-1200x630.png', width: 1200, height: 630, alt: 'Kale' }],
  })
  assert.deepEqual(metadata.twitter, {
    card: 'summary_large_image',
    title: 'Kale',
    description: 'A calmer tablet',
    images: [{ url: '/media/hero-1200x630.png', alt: 'Kale' }],
  })
})

test('summarizes long rich-text descriptions when no subtitle is set', () => {
  const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
  const metadata = buildProjectMetadata({ title: 'Long', description: words }, { canonicalPath: '/playground/long' })

  assert.ok(typeof metadata.description === 'string' && metadata.description.length <= 200)
  assert.ok(metadata.description.endsWith('…'))
})
