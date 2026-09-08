import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ModuleLikeButtonShell } from '../src/components/LazyModuleLikeButton'
import { AnimatedCount } from '../src/components/ModuleLikeButton'

function getCountClasses(markup: string) {
  const classes = markup.match(/<span aria-hidden="true" class="([^"]+)"/)?.[1]
  assert.ok(classes)
  return classes.split(' ')
}

test('removes the empty default count from layout while preserving the pill grid', () => {
  const emptyDefaultShell = renderToStaticMarkup(createElement(ModuleLikeButtonShell))
  const emptyDefaultCount = renderToStaticMarkup(createElement(AnimatedCount, { value: 0, pill: false }))
  const emptyPillShell = renderToStaticMarkup(createElement(ModuleLikeButtonShell, { variant: 'pill' }))
  const nonemptyDefaultCount = renderToStaticMarkup(createElement(AnimatedCount, { value: 3, pill: false }))

  const emptyDefaultShellClasses = getCountClasses(emptyDefaultShell)
  const emptyDefaultCountClasses = getCountClasses(emptyDefaultCount)
  const emptyPillShellClasses = getCountClasses(emptyPillShell)
  const nonemptyDefaultCountClasses = getCountClasses(nonemptyDefaultCount)

  assert.ok(emptyDefaultShellClasses.includes('hidden'))
  assert.equal(emptyDefaultShellClasses.includes('inline-flex'), false)
  assert.ok(emptyDefaultCountClasses.includes('hidden'))
  assert.equal(emptyDefaultCountClasses.includes('inline-flex'), false)
  assert.ok(emptyPillShellClasses.includes('invisible'))
  assert.ok(emptyPillShellClasses.includes('inline-flex'))
  assert.equal(nonemptyDefaultCountClasses.includes('hidden'), false)
  assert.equal(nonemptyDefaultCountClasses.includes('invisible'), false)
  assert.ok(nonemptyDefaultCountClasses.includes('inline-flex'))
})
