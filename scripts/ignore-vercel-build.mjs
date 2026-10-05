import { execFileSync } from 'node:child_process'

// Vercel's ignored build step uses exit 0 to skip and exit 1 to build.
// Missing Git metadata or history must never prevent a deployment.
function shouldSkipBuild() {
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA
  const current = process.env.VERCEL_GIT_COMMIT_SHA
  const commitHash = /^[a-f0-9]{40,64}$/i
  if (!previous || !current || !commitHash.test(previous) || !commitHash.test(current)) {
    return false
  }

  const git = (...args) => execFileSync('git', args, {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000,
  })

  try {
    if (git('rev-parse', 'HEAD').trim() !== current || previous === current) return false
    git('merge-base', '--is-ancestor', previous, current)

    // Compare with the last successful deployment, not just the previous commit.
    // Disable rename detection so moving a runtime file into docs still builds.
    const paths = git('diff', '--name-only', '-z', '--no-renames', previous, current, '--')
      .split('\0').filter(Boolean)
    return paths.length > 0 && paths.every((path) =>
      path.startsWith('docs/') || path.startsWith('tests/') || path.startsWith('.github/') ||
      ['AGENTS.md', 'README.md', 'LICENSE'].includes(path),
    )
  } catch {
    return false
  }
}

const skip = shouldSkipBuild()
console.log(skip
  ? 'Skipping build: only documentation, tests, or CI changed since the last successful deployment.'
  : 'Continuing build: site changes, redeployment, or incomplete deployment history.')
process.exitCode = skip ? 0 : 1
