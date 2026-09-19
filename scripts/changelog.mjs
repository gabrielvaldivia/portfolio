import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const ENTRIES = 'src/data/changelog-entries.json'
const HISTORY = 'src/data/changelog-history.json'
const CHANGELOG_FILES = new Set([
  ENTRIES,
  HISTORY,
  'src/data/changelog.ts',
  'scripts/changelog.mjs',
  'tests/changelog.test.ts',
  '.github/workflows/changelog.yml',
  'docs/changelog.md',
])

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  })
}

function readJSON(cwd, path) {
  return JSON.parse(readFileSync(resolve(cwd, path), 'utf8'))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function isChangelogFile(path) {
  return CHANGELOG_FILES.has(path) || path.startsWith('src/app/(frontend)/changelog/')
}

export function isSiteFile(path) {
  if (isChangelogFile(path)) return false
  if (path === 'src/payload-types.ts' || path === 'src/app/(payload)/admin/importMap.js') return false
  return /^(src\/|public\/|scripts\/)/.test(path)
    || /^(package(?:-lock)?\.json|next\.config\.[^/]+|vercel\.json|postcss\.config\.[^/]+|tsconfig\.json)$/.test(path)
}

export function validateData(entries, history) {
  assert(Array.isArray(entries) && entries.length > 0, 'The changelog needs at least one entry.')
  const dates = new Set()
  let previousDate = '9999-12-31'
  for (const entry of entries) {
    assert(entry && validDate(entry.date), 'Each entry needs a valid YYYY-MM-DD date.')
    assert(!dates.has(entry.date), `Duplicate entry for ${entry.date}; combine same-day changes.`)
    assert(entry.date < previousDate, 'Changelog entries must be ordered newest first.')
    assert(text(entry.title), `Missing title for ${entry.date}.`)
    assert(Array.isArray(entry.changes) && entry.changes.length > 0 && entry.changes.every(text), `Missing summary for ${entry.date}.`)
    assert(new Set(entry.changes).size === entry.changes.length, `Duplicate summary text for ${entry.date}.`)
    dates.add(entry.date)
    previousDate = entry.date
  }

  assert(history && /^[a-f0-9]{40}$/.test(history.throughCommit), 'History needs a valid throughCommit hash.')
  assert(Array.isArray(history.commits), 'History commits must be an array.')
  const hashes = new Set()
  previousDate = '9999-12-31'
  for (const commit of history.commits) {
    assert(commit && /^[a-f0-9]{40}$/.test(commit.hash), 'Invalid commit hash in changelog history.')
    assert(!hashes.has(commit.hash), `Duplicate source commit ${commit.hash}.`)
    assert(validDate(commit.date), `Invalid date for ${commit.hash}.`)
    assert(commit.date <= previousDate, 'Source commits must be ordered newest date first.')
    assert(text(commit.subject), `Missing subject for ${commit.hash}.`)
    assert(dates.has(commit.date), `Add a summary for ${commit.date} to ${ENTRIES} before importing its commits.`)
    hashes.add(commit.hash)
    previousDate = commit.date
  }
}

function resolveCommit(cwd, ref) {
  assert(text(ref) && !/^0+$/.test(ref), 'A valid base/head commit is required; fetch the comparison branch first.')
  try {
    return git(cwd, 'rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim()
  } catch {
    throw new Error(`Cannot find commit ${ref}. Fetch the comparison branch and full history first.`)
  }
}

function assertFullHistory(cwd) {
  assert(git(cwd, 'rev-parse', '--is-shallow-repository').trim() === 'false', 'Full Git history is required. Run git fetch --unshallow first.')
}

function importRows(cwd, history, head) {
  assertFullHistory(cwd)
  try {
    git(cwd, 'merge-base', '--is-ancestor', history.throughCommit, head)
  } catch {
    // Squash merges and rebases replace hashes. Rescan reachable history and
    // deduplicate against the archive, retaining the original source records.
    const rows = git(cwd, 'log', '--reverse', '--format=%H%x09%aI%x09%s', head, '--').trim()
    const known = new Set(history.commits.map((commit) => commit.hash))
    assert(rows.split('\n').some((row) => known.has(row.split('\t')[0])), 'This checkout shares no recorded history with the changelog. Sync the correct repository before importing.')
    return rows
  }
  return git(cwd, 'log', '--reverse', '--format=%H%x09%aI%x09%s', `${history.throughCommit}..${head}`, '--').trim()
}

export function updateHistory(cwd, headRef = 'HEAD') {
  const entries = readJSON(cwd, ENTRIES)
  const history = readJSON(cwd, HISTORY)
  validateData(entries, history)
  const head = resolveCommit(cwd, headRef)
  const rows = importRows(cwd, history, head)
  const existing = new Set(history.commits.map((commit) => commit.hash))
  const added = []
  let skipped = 0
  for (const row of rows ? rows.split('\n') : []) {
    const [hash, authoredAt, ...subjectParts] = row.split('\t')
    if (existing.has(hash)) continue
    const files = git(cwd, 'diff-tree', '--root', '--no-commit-id', '--name-only', '--no-renames', '-r', '-m', '--first-parent', '-z', hash, '--').split('\0').filter(Boolean)
    if (files.length === 0 || files.every(isChangelogFile)) {
      skipped += 1
      continue
    }
    added.push({ hash, date: authoredAt.slice(0, 10), subject: subjectParts.join('\t') })
  }

  // Do not chase the hash of commits which only refresh this file. Without new
  // source commits, repeat runs must leave the snapshot byte-for-byte unchanged.
  if (added.length === 0) return { added: 0, skipped }
  const knownDates = new Set(entries.map((entry) => entry.date))
  const missing = added.filter((commit) => !knownDates.has(commit.date))
  assert(missing.length === 0, `Write daily summaries in ${ENTRIES}, then rerun the importer:\n${missing.map((commit) => `  ${commit.date} ${commit.hash.slice(0, 7)} ${commit.subject}`).join('\n')}`)
  const updated = {
    ...history,
    throughCommit: head,
    commits: [...added.reverse(), ...history.commits].sort((a, b) => b.date.localeCompare(a.date)),
  }
  validateData(entries, updated)
  writeFileSync(resolve(cwd, HISTORY), `${JSON.stringify(updated, null, 2)}\n`)
  return { added: added.length, skipped }
}

function entriesAtCommit(cwd, ref) {
  const exists = git(cwd, 'ls-tree', '--name-only', ref, '--', ENTRIES).trim()
  return exists ? JSON.parse(git(cwd, 'show', `${ref}:${ENTRIES}`)) : []
}

export function hasSummaryUpdate(before, after) {
  // A title tweak, reordering bullets, or refreshing the raw history is not a
  // summary of a new site change. Require new copy on the latest dated entry.
  const latest = after[0]
  const previous = before.find((entry) => entry.date === latest.date)
  if (before[0] && latest.date < before[0].date) return false
  return !previous || latest.changes.some((change) => !previous.changes.includes(change))
}

/** @param {string} cwd @param {{ base?: string, head?: string }} options */
export function checkChangelog(cwd, { base = 'HEAD', head } = {}) {
  const baseCommit = resolveCommit(cwd, base)
  const headCommit = head ? resolveCommit(cwd, head) : undefined
  // CI reads the requested revision, even if the runner checked out a merge ref.
  const entries = headCommit ? entriesAtCommit(cwd, headCommit) : readJSON(cwd, ENTRIES)
  const history = headCommit ? JSON.parse(git(cwd, 'show', `${headCommit}:${HISTORY}`)) : readJSON(cwd, HISTORY)
  validateData(entries, history)
  assertFullHistory(cwd)
  const files = git(cwd, 'diff', '--name-only', '--no-renames', '-z', baseCommit, ...(headCommit ? [headCommit] : []), '--').split('\0').filter(Boolean)
  if (!headCommit) files.push(...git(cwd, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean))
  const siteFiles = [...new Set(files.filter(isSiteFile))]
  const before = entriesAtCommit(cwd, baseCommit)
  assert(siteFiles.length === 0 || hasSummaryUpdate(before, entries), `Site changes need a new or expanded summary in the latest entry of ${ENTRIES}:\n${siteFiles.map((file) => `  ${file}`).join('\n')}\nGroup small visual refinements into one polish bullet. Updating only commit details does not satisfy this check.`)
  return { entries: entries.length, commits: history.commits.length, siteFiles: siteFiles.length }
}

function main() {
  const { values, positionals } = parseArgs({
    options: { base: { type: 'string' }, head: { type: 'string' }, help: { type: 'boolean' } },
    allowPositionals: true,
  })
  const [command] = positionals
  if (values.help) {
    console.log('changelog.mjs update [--head REF]\nchangelog.mjs check [--base REF] [--head REF]\nWithout --head, check includes staged, unstaged, and untracked files against HEAD (or --base).')
    return
  }
  assert(positionals.length === 1 && ['update', 'check'].includes(command), 'Use npm run changelog:update or npm run check:changelog -- [--base REF] [--head REF].')
  assert(command !== 'update' || !values.base, '--base is only supported by check.')
  const cwd = git(process.cwd(), 'rev-parse', '--show-toplevel').trim()
  if (command === 'update') {
    const result = updateHistory(cwd, values.head)
    console.log(`Changelog history: imported ${result.added} commits; skipped ${result.skipped} changelog-only or empty commits.`)
  } else {
    const result = checkChangelog(cwd, values)
    console.log(`Changelog passed: ${result.entries} entries, ${result.commits} source commits, ${result.siteFiles} changed site files.`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
