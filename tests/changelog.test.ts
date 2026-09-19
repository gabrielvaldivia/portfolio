import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { checkChangelog, hasSummaryUpdate, updateHistory, validateData } from '../scripts/changelog.mjs'

const entriesPath = 'src/data/changelog-entries.json'
const historyPath = 'src/data/changelog-history.json'
const initialEntry = { date: '2026-09-18', title: 'First version', changes: ['Created the site.', 'Added project pages.'] }

function fixture(t: TestContext) {
  const cwd = mkdtempSync(join(tmpdir(), 'changelog-test-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  function git(...args: string[]) {
    return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  }
  function put(path: string, value: string | object) {
    mkdirSync(dirname(join(cwd, path)), { recursive: true })
    writeFileSync(join(cwd, path), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
  }
  function read(path: string) {
    return readFileSync(join(cwd, path), 'utf8')
  }
  function commit(subject: string, date = '2026-09-18T12:00:00-04:00') {
    git('add', '--all')
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-m', subject], {
      cwd, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    })
    return git('rev-parse', 'HEAD')
  }
  git('init', '-b', 'main')
  git('config', 'user.name', 'Changelog test')
  git('config', 'user.email', 'changelog@example.test')
  put('src/example.ts', 'export const example = 1\n')
  const first = commit('Initial site')
  put(entriesPath, [initialEntry])
  put(historyPath, { throughCommit: first, commits: [{ hash: first, date: initialEntry.date, subject: 'Initial site' }] })
  const base = commit('Record changelog')
  return { cwd, git, put, read, commit, first, base }
}

test('imports source commits exactly once and does not chase its own maintenance commits', (t) => {
  const repo = fixture(t)
  repo.put('src/example.ts', 'export const example = 2\n')
  const change = repo.commit('Improve the site — preserve punctuation')
  repo.put('docs/changelog.md', 'How to update the history\n')
  repo.commit('Document the changelog')
  const result = updateHistory(repo.cwd)
  assert.equal(result.added, 1)
  assert.equal(result.skipped, 2)
  const snapshot = repo.read(historyPath)
  const history = JSON.parse(snapshot)
  assert.deepEqual(history.commits.map((commit: { hash: string }) => commit.hash), [change, repo.first])
  repo.commit('Refresh changelog history')
  assert.equal(updateHistory(repo.cwd).added, 0)
  assert.equal(updateHistory(repo.cwd).added, 0)
  assert.equal(repo.read(historyPath), snapshot)
})

test('missing daily summaries fail without changing the snapshot; imports preserve the author’s local date', (t) => {
  const repo = fixture(t)
  repo.put('src/example.ts', 'export const example = 3\n')
  repo.commit('Add something new', '2026-09-19T23:30:00-04:00')
  const original = repo.read(historyPath)
  assert.throws(() => updateHistory(repo.cwd), /2026-09-19 .* Add something new/)
  assert.equal(repo.read(historyPath), original)
  repo.put(entriesPath, [{ date: '2026-09-19', title: 'New feature', changes: ['Added something new.'] }, initialEntry])
  assert.equal(updateHistory(repo.cwd).added, 1)
  assert.equal(JSON.parse(repo.read(historyPath)).commits[0].date, '2026-09-19')
})

test('mixed site and changelog commits are imported, including merged branch work', (t) => {
  const repo = fixture(t)
  repo.git('checkout', '-b', 'feature')
  repo.put('src/feature.ts', 'export const feature = true\n')
  repo.put(entriesPath, [{ ...initialEntry, changes: [...initialEntry.changes, 'Added a feature.'] }])
  const feature = repo.commit('Feature and its summary')
  repo.git('checkout', 'main')
  repo.git('merge', '--no-ff', 'feature', '-m', 'Merge feature')
  // The merge was made today; provide that original author date as well.
  const mergeDate = repo.git('show', '-s', '--format=%aI', 'HEAD').slice(0, 10)
  if (mergeDate !== initialEntry.date) {
    const entries = JSON.parse(repo.read(entriesPath))
    entries.push({ date: mergeDate, title: 'Merged feature', changes: ['Included the new feature.'] })
    entries.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))
    repo.put(entriesPath, entries)
  }
  assert.equal(updateHistory(repo.cwd).added, 2)
  assert(JSON.parse(repo.read(historyPath)).commits.some((commit: { hash: string }) => commit.hash === feature))
})

test('local checking includes unstaged, staged, untracked, and deleted site files', (t) => {
  const repo = fixture(t)
  repo.put('src/example.ts', 'export const example = 4\n')
  assert.throws(() => checkChangelog(repo.cwd), /Site changes need a new or expanded summary/)
  repo.git('add', 'src/example.ts')
  assert.throws(() => checkChangelog(repo.cwd), /src\/example.ts/)
  repo.put('src/new.ts', 'export const other = true\n')
  assert.throws(() => checkChangelog(repo.cwd), /src\/new.ts/)
  rmSync(join(repo.cwd, 'src/example.ts'))
  assert.throws(() => checkChangelog(repo.cwd), /src\/example.ts/)
  repo.put(entriesPath, [{ ...initialEntry, changes: [...initialEntry.changes, 'Improved the site.'] }])
  assert.equal(checkChangelog(repo.cwd).siteFiles, 2)
})

test('a raw history update, old-day edit, title tweak, or reordered bullets does not replace a new summary', () => {
  const before = [initialEntry, { date: '2026-09-17', title: 'Earlier', changes: ['Earlier work.'] }]
  assert.equal(hasSummaryUpdate(before, before), false)
  assert.equal(hasSummaryUpdate(before, [{ ...initialEntry, title: 'Different title' }, before[1]]), false)
  assert.equal(hasSummaryUpdate(before, [{ ...initialEntry, changes: [...initialEntry.changes].reverse() }, before[1]]), false)
  assert.equal(hasSummaryUpdate(before, [initialEntry, { ...before[1], changes: ['Changed old prose.'] }]), false)
})

test('committed comparison reads the actual base and head, ignoring a later working-tree summary', (t) => {
  const repo = fixture(t)
  repo.put('src/example.ts', 'export const example = 5\n')
  const withoutSummary = repo.commit('Forgot a summary')
  repo.put(entriesPath, [{ ...initialEntry, changes: [...initialEntry.changes, 'Improved the site.'] }])
  assert.throws(() => checkChangelog(repo.cwd, { base: repo.base, head: withoutSummary }), /Site changes need/)
  const withSummary = repo.commit('Add the missing summary')
  assert.equal(checkChangelog(repo.cwd, { base: repo.base, head: withSummary }).siteFiles, 1)
})

test('documentation, test, and changelog-only work needs no announcement', (t) => {
  const repo = fixture(t)
  repo.put('README.md', 'Site documentation\n')
  repo.put('tests/example.test.ts', '// Test coverage\n')
  repo.put('src/app/(frontend)/changelog/page.tsx', '// Refine the changelog\n')
  assert.equal(checkChangelog(repo.cwd).siteFiles, 0)
})

test('invalid dates, duplicate hashes, and orphaned source dates are rejected', () => {
  const history = { throughCommit: 'a'.repeat(40), commits: [{ hash: 'a'.repeat(40), date: initialEntry.date, subject: 'Initial' }] }
  assert.throws(() => validateData([{ ...initialEntry, date: '2026-02-30' }], history), /valid YYYY-MM-DD/)
  assert.throws(() => validateData([initialEntry, initialEntry], history), /Duplicate entry/)
  assert.throws(() => validateData([initialEntry], { ...history, commits: [...history.commits, ...history.commits] }), /Duplicate source commit/)
  assert.throws(() => validateData([initialEntry], { ...history, commits: [{ ...history.commits[0], date: '2026-09-17' }] }), /Add a summary/)
})

test('squash merges can replace the history cursor without breaking future imports', (t) => {
  const repo = fixture(t)
  repo.git('checkout', '-b', 'feature')
  repo.put('src/example.ts', 'export const example = 6\n')
  repo.put(entriesPath, [{ ...initialEntry, changes: [...initialEntry.changes, 'Added a feature.'] }])
  const feature = repo.commit('Add a feature')
  updateHistory(repo.cwd)
  repo.commit('Import feature history')
  repo.git('checkout', 'main')
  repo.git('merge', '--squash', 'feature')
  const squash = repo.commit('Ship the feature')
  assert.equal(updateHistory(repo.cwd).added, 1)
  const hashes = JSON.parse(repo.read(historyPath)).commits.map((commit: { hash: string }) => commit.hash)
  assert(hashes.includes(feature))
  assert(hashes.includes(squash))
  assert.equal(updateHistory(repo.cwd).added, 0)
  assert.equal(checkChangelog(repo.cwd, { base: repo.base }).siteFiles, 1)
})

test('shallow and unrelated histories fail without overwriting the archive', (t) => {
  const repo = fixture(t)
  const clone = mkdtempSync(join(tmpdir(), 'changelog-shallow-'))
  t.after(() => rmSync(clone, { recursive: true, force: true }))
  execFileSync('git', ['clone', '--depth=1', `file://${repo.cwd}`, clone], { stdio: 'pipe' })
  assert.throws(() => updateHistory(clone), /Full Git history is required/)
  const original = repo.read(historyPath)
  repo.git('checkout', '--orphan', 'unrelated')
  repo.commit('Unrelated root')
  assert.throws(() => updateHistory(repo.cwd), /shares no recorded history/)
  assert.equal(repo.read(historyPath), original)
})
