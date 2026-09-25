import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AboutBio } from '../src/components/AboutBio'
import { currentBiography } from '../scripts/lib/pageContentSync'

test('the rendered biography follows edited CMS copy and preserves its links', () => {
  const bio = currentBiography(true)
  bio.root.children[1].children = [{ type: 'text', text: 'A newly edited CMS biography.', format: 0, mode: 'normal', style: '', detail: 0, version: 1 }]
  const html = renderToStaticMarkup(createElement(AboutBio, { data: bio }))
  assert.match(html, /A newly edited CMS biography\./)
  assert.match(html, /href="\/timeline"/)
  assert.doesNotMatch(html, /As a fractional design partner/)
})
