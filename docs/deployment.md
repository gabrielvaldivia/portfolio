# Keeping deployments inexpensive

Push a completed, locally verified change to `master` once. Vercel's Git integration deploys it automatically; a separate CLI production deployment would pay for another build. Preview builds are disabled in `vercel.json`. CMS content edits refresh affected pages without a new deployment.

The ignored build step skips changes limited to `docs/`, `tests/`, `.github/`, `AGENTS.md`, `README.md`, and `LICENSE`. It compares against `VERCEL_GIT_PREVIOUS_SHA`, the last successful deployment for this project and branch, so a documentation commit cannot hide an earlier undeployed site change.

Source, public assets, scripts, dependencies, configuration, and unknown paths always build. Missing metadata, unavailable or unrelated Git history, and redeploying the same commit also build. If Git history is too shallow to verify the comparison, the safeguard allows the build.

Verify changes to this safeguard with `node --import tsx --test tests/vercel-build-ignore.test.ts`.

References: [Vercel ignored builds](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel), [previous deployment SHA](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha).
