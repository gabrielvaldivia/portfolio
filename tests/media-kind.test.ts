import assert from 'node:assert/strict'
import test from 'node:test'
import { isVideoMedia } from '../src/lib/mediaKind'

test('a video upload is recognised by its MIME type', () => {
  assert.equal(isVideoMedia({ mimeType: 'video/mp4', url: 'https://cdn.example/clip.mp4' }), true)
  assert.equal(isVideoMedia({ mimeType: 'image/jpeg', url: 'https://cdn.example/shot.jpg' }), false)
})

test('the MIME type wins over a misleading file name', () => {
  assert.equal(isVideoMedia({ mimeType: 'image/png', url: 'https://cdn.example/poster.mp4.png' }), false)
})

test('without a MIME type, the extension decides', () => {
  assert.equal(isVideoMedia({ url: 'https://cdn.example/clip.webm?v=2' }), true)
  assert.equal(isVideoMedia({ url: 'https://cdn.example/clip.MOV' }), true)
  assert.equal(isVideoMedia({ url: 'https://cdn.example/shot.png' }), false)
})

test('missing media is not a video', () => {
  assert.equal(isVideoMedia(null), false)
  assert.equal(isVideoMedia(undefined), false)
  assert.equal(isVideoMedia({}), false)
})
