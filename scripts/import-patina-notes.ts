// Import Markdown essays from Patina into the Notes collection as drafts.
// Existing notes are never overwritten, making the script safe to run again.
//
// Usage:
//   npx payload run scripts/import-patina-notes.ts -- --dry-run
//   npx payload run scripts/import-patina-notes.ts
//   npx payload run scripts/import-patina-notes.ts -- --refresh=an-existing-slug
//   PATINA_NOTES_DIR=/path/to/blog npx payload run scripts/import-patina-notes.ts

import { readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'
import config from '@payload-config'
import { getPayload } from 'payload'

type Essay = {
  body: string
  canonicalSourceURL: string | null
  date: string
  excerpt: string
  filename: string
  imageCount: number
  slug: string
  sourceURL: string | null
  title: string
}

const DEFAULT_PATINA_NOTES_DIR = path.join(
  homedir(),
  'Library',
  'Mobile Documents',
  'iCloud~com~gabrielvaldivia~patina',
  'Documents',
  'blog',
)

const isDryRun = process.argv.includes('--dry-run')
const refreshSlug = process.argv
  .find((argument) => argument.startsWith('--refresh='))
  ?.slice('--refresh='.length)
const sourceDirectory = process.env.PATINA_NOTES_DIR || DEFAULT_PATINA_NOTES_DIR

const slugify = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const canonicalizeURL = (value: string | null) => {
  if (!value) return null

  try {
    const url = new URL(value)
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value
  }
}

const plainText = (markdown: string) => markdown
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/^>\s?/gm, '')
  .replace(/^[-*+]\s+/gm, '')
  .replace(/^\d+\.\s+/gm, '')
  .replace(/[*_~`]/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const makeExcerpt = (markdown: string) => {
  const text = plainText(markdown)
  if (text.length <= 240) return text

  const shortened = text.slice(0, 240)
  const lastSpace = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, Math.max(lastSpace, 200)).trim()}…`
}

const preserveImageLinks = (markdown: string) => {
  let imageCount = 0

  const withoutTrackingPixels = markdown.replace(
    /!?\[[^\]]*\]\(https?:\/\/medium\.com\/_\/stat\?[^)]*\)/g,
    '',
  )

  const linkedImages = withoutTrackingPixels.replace(
    /\[!\[([^\]]*)\]\((https?:\/\/[^\s)]+)[^)]*\)[^\]]*\]\((https?:\/\/[^\s)]+)[^)]*\)/g,
    (_match, alt: string, _imageURL: string, destinationURL: string) => {
      imageCount += 1
      const label = plainText(alt) || 'View image'
      return `\n\n[${label}](${destinationURL})\n\n`
    },
  )

  const body = linkedImages.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)[^)]*\)/g,
    (_match, alt: string, imageURL: string) => {
      imageCount += 1
      const label = plainText(alt) || 'View image'
      return `\n\n[${label}](${imageURL})\n\n`
    },
  )

  return {
    body: body.replace(/\n{3,}/g, '\n\n').trim(),
    imageCount,
  }
}

const parseEssay = (filename: string): Essay => {
  const filePath = path.join(sourceDirectory, filename)
  const raw = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim()
  const title = raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
    || filename.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')
  const sourceURL = raw.match(/^\*\*URL:\*\*\s*(.+)$/m)?.[1]?.trim() || null
  const filenameDate = filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]

  if (!filenameDate) {
    throw new Error(`Could not find a date in ${filename}`)
  }

  const markdown = raw
    .replace(/^#\s+.*(?:\n|$)/, '')
    .replace(/^\*\*(?:Date|Source|URL):\*\*.*(?:\n|$)/gm, '')
    .trim()
  const preserved = preserveImageLinks(markdown)

  return {
    body: preserved.body,
    canonicalSourceURL: canonicalizeURL(sourceURL),
    date: `${filenameDate}T12:00:00.000Z`,
    excerpt: makeExcerpt(preserved.body),
    filename,
    imageCount: preserved.imageCount,
    slug: slugify(filename.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')),
    sourceURL,
    title,
  }
}

const preferCanonicalExport = (current: Essay, candidate: Essay) => {
  const score = (essay: Essay) => {
    let value = 0
    if (essay.sourceURL === essay.canonicalSourceURL) value += 10
    if (!essay.sourceURL?.includes('source=rss')) value += 5
    value -= essay.imageCount
    return value
  }

  return score(candidate) > score(current) ? candidate : current
}

const files = readdirSync(sourceDirectory)
  .filter((filename) => filename.endsWith('.md') && filename !== 'README.md')
  .sort()
const parsedEssays = files.map(parseEssay)
const essaysDeduplicatedBySource: Essay[] = []
const essayIndexBySource = new Map<string, number>()
const duplicateFiles: string[] = []

for (const essay of parsedEssays) {
  if (!essay.canonicalSourceURL) {
    essaysDeduplicatedBySource.push(essay)
    continue
  }

  const existingIndex = essayIndexBySource.get(essay.canonicalSourceURL)
  if (existingIndex === undefined) {
    essayIndexBySource.set(essay.canonicalSourceURL, essaysDeduplicatedBySource.length)
    essaysDeduplicatedBySource.push(essay)
    continue
  }

  const existingEssay = essaysDeduplicatedBySource[existingIndex]
  const preferredEssay = preferCanonicalExport(existingEssay, essay)
  duplicateFiles.push(preferredEssay === existingEssay ? essay.filename : existingEssay.filename)
  essaysDeduplicatedBySource[existingIndex] = preferredEssay
}

const uniqueEssays: Essay[] = []
const essayIndexBySlug = new Map<string, number>()

for (const essay of essaysDeduplicatedBySource) {
  const existingIndex = essayIndexBySlug.get(essay.slug)
  if (existingIndex === undefined) {
    essayIndexBySlug.set(essay.slug, uniqueEssays.length)
    uniqueEssays.push(essay)
    continue
  }

  const existingEssay = uniqueEssays[existingIndex]
  const preferredEssay = essay.date > existingEssay.date ? essay : existingEssay
  duplicateFiles.push(preferredEssay === existingEssay ? essay.filename : existingEssay.filename)
  uniqueEssays[existingIndex] = preferredEssay
}

const payload = await getPayload({ config })
const existingNotes = await payload.find({
  collection: 'notes',
  depth: 0,
  draft: true,
  limit: 1000,
  overrideAccess: true,
  pagination: false,
})
const existingNotesBySlug = new Map(existingNotes.docs.map((note) => [note.slug, note]))
const existingSlugs = new Set(existingNotesBySlug.keys())
const statusCounts = Object.fromEntries(
  Object.entries(Object.groupBy(existingNotes.docs, (note) => note._status || 'published'))
    .map(([status, notes]) => [status, notes.length]),
)
const essaysToCreate = uniqueEssays.filter((essay) => !existingSlugs.has(essay.slug))
const essaysToRefresh = refreshSlug
  ? uniqueEssays.filter((essay) => essay.slug === refreshSlug && existingSlugs.has(essay.slug))
  : []
const skippedExisting = uniqueEssays
  .filter((essay) => existingSlugs.has(essay.slug) && essay.slug !== refreshSlug)
  .map((essay) => essay.slug)

if (!isDryRun) {
  const editorConfig = await editorConfigFactory.default({ config: payload.config })

  const noteData = (essay: Essay) => {
    const body = convertMarkdownToLexical({
      editorConfig,
      markdown: essay.body,
    })

    return {
      _status: 'draft' as const,
      body,
      excerpt: essay.excerpt,
      publishedAt: essay.date,
      slug: essay.slug,
      title: essay.title,
    }
  }

  for (const essay of essaysToCreate) {
    await payload.create({
      collection: 'notes',
      data: noteData(essay),
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
  }

  for (const essay of essaysToRefresh) {
    const existingNote = existingNotesBySlug.get(essay.slug)
    if (!existingNote) continue

    await payload.update({
      collection: 'notes',
      id: existingNote.id,
      data: noteData(essay),
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
  }
}

console.log(JSON.stringify({
  created: isDryRun ? 0 : essaysToCreate.length,
  draftsReady: essaysToCreate.length,
  dryRun: isDryRun,
  duplicateFiles,
  existingNotes: existingNotes.totalDocs,
  imageReferencesPreserved: uniqueEssays.reduce((total, essay) => total + essay.imageCount, 0),
  refreshed: isDryRun ? 0 : essaysToRefresh.length,
  refreshReady: essaysToRefresh.map((essay) => essay.slug),
  skippedExisting,
  sourceDirectory,
  sourceFiles: parsedEssays.length,
  statusCounts,
  uniqueEssays: uniqueEssays.length,
}, null, 2))

process.exit(0)
