import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveHeroTestimonial } from '../src/lib/heroTestimonial'

const base = {
  projectId: 'project-1',
  projectTitle: 'Project',
  source: { id: 12, name: 'Original author', testimonial: 'Original quote.' },
}

test('a name-only override keeps the original quote and testimonial id', () => {
  assert.deepEqual(resolveHeroTestimonial({ ...base, nameOverride: '  Custom author  ' }), {
    id: '12', quote: 'Original quote.', name: 'Custom author',
  })
})

test('quote and name overrides work independently or together', () => {
  assert.deepEqual(resolveHeroTestimonial({ ...base, quoteOverride: 'Custom quote.' }), {
    id: 'project-1-testimonial-override', quote: 'Custom quote.', name: 'Original author',
  })
  assert.deepEqual(resolveHeroTestimonial({ ...base, quoteOverride: ' Custom quote. ', nameOverride: 'Custom author' }), {
    id: 'project-1-testimonial-override', quote: 'Custom quote.', name: 'Custom author',
  })
})

test('blank overrides fall back to original content', () => {
  assert.deepEqual(resolveHeroTestimonial({ ...base, quoteOverride: '  ', nameOverride: '  ' }), {
    id: '12', quote: 'Original quote.', name: 'Original author',
  })
})

test('custom quotes can exist without a source, but names alone do not invent a quote', () => {
  assert.deepEqual(resolveHeroTestimonial({ ...base, source: null, quoteOverride: 'Custom quote.' }), {
    id: 'project-1-testimonial-override', quote: 'Custom quote.', name: 'Project',
  })
  assert.equal(resolveHeroTestimonial({ ...base, source: null, nameOverride: 'Custom author' }), undefined)
})
