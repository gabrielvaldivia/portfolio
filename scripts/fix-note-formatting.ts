// Normalize every note body so body headings use h3 and malformed Markdown
// asterisks are not rendered. Asterisks within words or expressions, such as
// “f*cked” or “2*3”, are preserved.
//
// Usage:
//   npx payload run scripts/fix-note-formatting.ts -- --dry-run
//   npx payload run scripts/fix-note-formatting.ts

import config from '@payload-config'
import { getPayload } from 'payload'
import {
  hasNoteFormattingChanges,
  normalizeNoteBodyFormatting,
} from '../src/lib/noteFormatting'

const isDryRun = process.argv.includes('--dry-run')
const payload = await getPayload({ config })
const result = await payload.find({
  collection: 'notes',
  depth: 0,
  draft: true,
  limit: 1000,
  overrideAccess: true,
  pagination: false,
  sort: '-publishedAt',
})

const affected = []

for (const note of result.docs) {
  const normalized = normalizeNoteBodyFormatting(note.body, { title: note.title })
  if (!hasNoteFormattingChanges(normalized.changes)) continue

  affected.push({
    changes: normalized.changes,
    id: note.id,
    slug: note.slug,
    status: note._status || 'published',
    title: note.title,
  })

  if (isDryRun) continue

  await payload.update({
    collection: 'notes',
    id: note.id,
    data: { body: normalized.body },
    context: { skipNoteNewsletter: true },
    depth: 0,
    draft: note._status === 'draft',
    overrideAccess: true,
  })
}

console.log(JSON.stringify({
  affected,
  affectedNotes: affected.length,
  auditedNotes: result.docs.length,
  dryRun: isDryRun,
  duplicateTitlesRemoved: affected.reduce(
    (total, note) => total + note.changes.duplicateTitles,
    0,
  ),
  headingLevelsChanged: affected.reduce(
    (total, note) => total + note.changes.headingLevels,
    0,
  ),
  strayAsterisksRemoved: affected.reduce(
    (total, note) => total + note.changes.strayAsterisks,
    0,
  ),
  updatedNotes: isDryRun ? 0 : affected.length,
}, null, 2))

process.exit(0)
