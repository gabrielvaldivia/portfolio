<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Changelog maintenance

- Include a new or expanded daily summary in `src/data/changelog-entries.json` with every meaningful site feature, fix, content, or performance change. Write concise descriptions of the resulting behavior; group small visual refinements into a polish bullet. Keep one entry per day, newest first.
- Before finishing site work, run `npm run changelog:update` to import already-committed history. If it reports dates without summaries, write those summaries and rerun. Do not edit generated commit details or reset the history cursor by hand.
- Run `npm run check:changelog` before committing. For already-committed work, pass the intended comparison refs with `-- --base <base> --head HEAD`. Include updated summaries and imported history with the site changes.
- New summaries may precede their commit hashes. The next import adds those details; do not make extra commits just to capture the hash of the changelog itself.
- Changelog-only maintenance and changes limited to tests or documentation do not need a new announcement. Read `docs/changelog.md` for the exact scope and commands.
- Keep `/changelog` unlinked from navigation, the sitemap, and agent-readable indexes, with indexing disabled, until the user explicitly asks to list it.
