import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitIntoAlternatingRows } from '../src/lib/likedWorkRows'

const project = (item: string) => item[0]

test('alternates rows in rank order when projects differ', () => {
  assert.deepEqual(splitIntoAlternatingRows(['a1', 'b1', 'c1', 'd1'], project), [['a1', 'c1'], ['b1', 'd1']])
})

test('keeps one project away from its row neighbor and the other row', () => {
  // Ranked by likes: a dominates the top of the list.
  const [top, bottom] = splitIntoAlternatingRows(['a1', 'a2', 'a3', 'b1', 'c1', 'd1', 'b2', 'c2'], project)
  assert.deepEqual(top, ['a1', 'c1', 'd1', 'a3'])
  assert.deepEqual(bottom, ['b1', 'a2', 'b2', 'c2'])
  const sequence = top.flatMap((item, index) => [item, bottom[index]]).filter(Boolean)
  for (let index = 1; index < sequence.length; index += 1) {
    assert.notEqual(project(sequence[index]), project(sequence[index - 1]))
  }
  for (const row of [top, bottom]) {
    for (let index = 1; index < row.length; index += 1) {
      assert.notEqual(project(row[index]), project(row[index - 1]))
    }
  }
})

test('never repeats or drops items, even when one project is all that is left', () => {
  const items = ['a1', 'b1', 'a2', 'a3', 'a4']
  const [top, bottom] = splitIntoAlternatingRows(items, project)
  assert.deepEqual([...top, ...bottom].sort(), [...items].sort())
})
