import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getResponsiveImageCandidates,
  getResponsiveImageSrcSet,
} from '../src/lib/responsiveImage'

test('builds a sorted srcset from Payload image sizes and the original', () => {
  const media = {
    url: 'https://media.example/original.png',
    width: 2400,
    sizes: {
      medium: { url: 'https://media.example/medium.png', width: 900 },
      thumbnail: { url: 'https://media.example/thumb.png', width: 300 },
      xlarge: { url: 'https://media.example/xlarge.png', width: 1920 },
    },
  }

  assert.deepEqual(getResponsiveImageCandidates(media), [
    { url: 'https://media.example/thumb.png', width: 300 },
    { url: 'https://media.example/medium.png', width: 900 },
    { url: 'https://media.example/xlarge.png', width: 1920 },
    { url: 'https://media.example/original.png', width: 2400 },
  ])
  assert.equal(
    getResponsiveImageSrcSet(media),
    'https://media.example/thumb.png 300w, https://media.example/medium.png 900w, https://media.example/xlarge.png 1920w, https://media.example/original.png 2400w',
  )
})

test('uses configured widths when legacy size metadata omits dimensions', () => {
  const media = {
    url: 'https://media.example/original.png',
    width: 1800,
    sizes: {
      small: { url: 'https://media.example/small.png' },
      large: { url: 'https://media.example/large.png' },
    },
  }

  assert.deepEqual(getResponsiveImageCandidates(media), [
    { url: 'https://media.example/small.png', width: 600 },
    { url: 'https://media.example/large.png', width: 1400 },
    { url: 'https://media.example/original.png', width: 1800 },
  ])
})

test('falls back cleanly when no responsive variants exist', () => {
  assert.equal(getResponsiveImageSrcSet({ url: '/portrait.png', width: 800 }), undefined)
  assert.deepEqual(getResponsiveImageCandidates(null), [])
})

test('prefers a generated size over the original at the same width', () => {
  assert.deepEqual(getResponsiveImageCandidates({
    url: 'https://media.example/original.png',
    width: 1920,
    sizes: {
      xlarge: { url: 'https://media.example/xlarge.png', width: 1920 },
    },
  }), [
    { url: 'https://media.example/xlarge.png', width: 1920 },
  ])
})
