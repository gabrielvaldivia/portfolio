import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeNoteBodyFormatting } from '../src/lib/noteFormatting'

test('normalizes every body heading to h3 without changing the note content', () => {
  const input = {
    root: {
      children: [
        { type: 'heading', tag: 'h1', children: [{ type: 'text', text: 'One' }] },
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Two' }] },
        { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Three' }] },
        { type: 'heading', tag: 'h4', children: [{ type: 'text', text: 'Four' }] },
      ],
    },
  }

  const result = normalizeNoteBodyFormatting(input)

  assert.deepEqual(
    result.body.root.children.map((node) => node.tag),
    ['h3', 'h3', 'h3', 'h3'],
  )
  assert.equal(result.changes.headingLevels, 3)
  assert.equal(result.changes.strayAsterisks, 0)
  assert.equal(input.root.children[0].tag, 'h1')
})

test('removes broken Markdown stars while preserving intentional inline stars', () => {
  const input = {
    root: {
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: '*discover—*focus and ***you*** want ** **clarity' },
            { type: 'text', text: 'How we f*cked up; 2*3 still equals 6.' },
          ],
        },
      ],
    },
  }

  const result = normalizeNoteBodyFormatting(input)
  const [cleaned, intentional] = result.body.root.children[0].children

  assert.equal(cleaned.text, 'discover—focus and you want clarity')
  assert.equal(intentional.text, 'How we f*cked up; 2*3 still equals 6.')
  assert.equal(result.changes.strayAsterisks, 12)
})

test('removes a duplicated body title before normalizing the remaining headings', () => {
  const input = {
    root: {
      children: [
        { type: 'heading', tag: 'h1', children: [{ type: 'text', text: 'Interview your Product\u00a0Manager' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'Introduction' }] },
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'A section' }] },
      ],
    },
  }

  const result = normalizeNoteBodyFormatting(input, {
    title: 'Interview your Product Manager',
  })

  assert.equal(result.changes.duplicateTitles, 1)
  assert.equal(result.changes.headingLevels, 1)
  assert.equal(result.body.root.children.length, 2)
  assert.equal(result.body.root.children[0].type, 'paragraph')
  assert.equal(result.body.root.children[1].tag, 'h3')
})
