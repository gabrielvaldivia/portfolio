import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, type TestContext } from 'node:test'

const script = fileURLToPath(new URL('../scripts/ignore-vercel-build.mjs', import.meta.url))

function fixture(t: TestContext) {
  const cwd = mkdtempSync(join(tmpdir(), 'vercel-build-ignore-'))
  t.after(() => rmSync(cwd, { recursive: true, force: true }))
  const git = (...args: string[]) => execFileSync('git', [
    '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args,
  ], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  function put(path: string, value = 'example\n') {
    mkdirSync(dirname(join(cwd, path)), { recursive: true })
    writeFileSync(join(cwd, path), value)
  }
  function commit() {
    git('add', '--all')
    git('commit', '-m', 'Fixture change')
    return git('rev-parse', 'HEAD')
  }
  function run(previous = base, current = git('rev-parse', 'HEAD')) {
    const result = spawnSync(process.execPath, [script], {
      cwd, encoding: 'utf8',
      env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: previous, VERCEL_GIT_COMMIT_SHA: current },
    })
    assert.equal(result.error, undefined)
    assert.equal(result.signal, null)
    assert.equal(result.stderr, '')
    return result.status
  }
  git('init', '-b', 'main')
  git('config', 'user.name', 'Build ignore test')
  git('config', 'user.email', 'build-ignore@example.test')
  put('src/page.tsx')
  const base = commit()
  return { cwd, git, put, commit, run, base }
}

test('skips documentation, test, and CI changes together', (t) => {
  const repo = fixture(t)
  for (const path of ['docs/deployment.md', 'tests/site.test.ts', '.github/workflows/check.yml', 'AGENTS.md', 'README.md']) {
    repo.put(path)
  }
  repo.commit()
  assert.equal(repo.run(), 0)
})

test('builds runtime, asset, configuration, dependency, script, and unknown changes', (t) => {
  const repo = fixture(t)
  let previous = repo.base
  for (const path of ['src/page.tsx', 'public/photo.jpg', 'vercel.json', 'package-lock.json', 'scripts/job.mjs', 'content.md']) {
    repo.put(path, 'changed\n')
    const current = repo.commit()
    assert.equal(repo.run(previous, current), 1, path)
    previous = current
  }
})

test('includes earlier undeployed site changes when the latest commit is only docs', (t) => {
  const repo = fixture(t)
  repo.put('src/page.tsx', 'new site\n')
  repo.commit()
  repo.put('docs/deployment.md')
  repo.commit()
  assert.equal(repo.run(), 1)
})

test('moving a runtime file into docs still builds', (t) => {
  const repo = fixture(t)
  repo.put('docs/page.tsx')
  rmSync(join(repo.cwd, 'src/page.tsx'))
  repo.commit()
  assert.equal(repo.run(), 1)
})

test('first deployments, manual redeploys, and missing history continue building', (t) => {
  const repo = fixture(t)
  assert.equal(repo.run(), 1)
  repo.put('docs/deployment.md')
  repo.commit()
  assert.equal(repo.run(''), 1)
  assert.equal(repo.run(repo.base, ''), 1)
  assert.equal(repo.run('0'.repeat(40)), 1)
  assert.equal(repo.run('--invalid'), 1)
  assert.equal(repo.run(repo.base, repo.base), 1)
})

test('an unrelated history builds even when its only difference is documentation', (t) => {
  const repo = fixture(t)
  repo.git('checkout', '--orphan', 'rewritten')
  repo.put('docs/deployment.md')
  repo.commit()
  assert.equal(repo.run(), 1)
})
