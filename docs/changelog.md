# Keeping the changelog current

The unlisted `/changelog` page has two sources:

- `src/data/changelog-entries.json`: readable daily summaries, maintained with the work.
- `src/data/changelog-history.json`: original commit details, maintained by the importer.

## With each site change

1. Run `npm run changelog:update` to import commits since the last snapshot. If it lists dates without summaries, add those summaries first and rerun. A failed import leaves the snapshot unchanged.
2. Update the current day's entry in `changelog-entries.json`. Use `YYYY-MM-DD`, newest first, with one entry per day. Write one tweet-length summary of at most 280 characters, including spaces and punctuation but excluding the title and date; store it as one string in `changes`. Use the space for meaningful detail on busy days, without padding small fixes. Focus on visitor-facing outcomes and leave implementation details in the expandable commits. Rewrite the summary as work evolves instead of appending every tweak.
3. Run `npm run check:changelog`. It checks staged, unstaged, and untracked files against `HEAD`. To check committed work, use `npm run check:changelog -- --base origin/master --head HEAD` with an appropriate comparison ref.
4. Include the summary and any imported history in the same change as the site work.

An uncommitted change has no final commit hash yet. Its summary appears immediately; the next history update imports the commit details. The page hides the disclosure until details exist. The importer never writes prose or creates placeholder entries, and it does not run during a site build (deploy uploads may not contain Git history).

## What the importer does

It reads full Git history from the saved `throughCommit` through `HEAD`, preserving original author dates and commit messages. It includes commits from merged branches, deduplicates hashes, and skips empty commits and commits touching only changelog content, its route, or its dedicated tooling, tests, and documentation.

It advances the snapshot only when there are new source commits. Repeating it after a history-only commit therefore leaves the file unchanged, avoiding an endless cycle of changelog commits. After a squash merge or rebase replaces the saved cursor, it rescans reachable history and imports unseen hashes while preserving original source records. Shallow checkouts and unrelated repositories fail with an actionable message rather than dropping records.

## What the check enforces

The GitHub `Changelog / check` job runs on pull requests and pushes to `master`, using the actual base and head revisions and full history. It needs no package installation, credentials, or write access. Site changes under `src/`, `public/`, or `scripts/`, and application dependency/configuration changes, require new summary text in the latest daily entry. Generated CMS files and changelog maintenance are excluded. Changes limited to tests or documentation do not require an announcement.

Refreshing commit details, changing a title, reordering existing bullets, or editing an old entry is not sufficient. The check also rejects invalid or duplicate dates, empty summaries, duplicate source hashes, and source commits without a dated summary. It checks for coverage, not whether the prose accurately explains the change; that remains part of review.

The job reports failures in GitHub. Making it a required merge check is a separate repository branch-protection setting. Nothing here creates commits, pushes changes, schedules a background task, or deploys the site.

Keep `/changelog` out of navigation, the sitemap, and agent-readable indexes, and preserve its `noindex` metadata until explicitly asked to list it. Content edits made only in the CMS are outside this repository workflow.
