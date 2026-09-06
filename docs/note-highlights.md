# Public note highlights

Readers select 3–1,000 characters in a published note and choose **Highlight**.
Marks are public and always visible; tapping one shows its reader count and an
add/remove action. There is no show/hide menu, and the former local visibility
preference is ignored. Ownership uses the existing HTTP-only `gv_module_liker` cookie:
it is remembered in that browser, not synced between devices. No accounts, emails,
comments, or raw IP addresses are collected by this feature.

## Implementation

- The essay remains server-rendered. Highlighte.rs loads only when marks exist;
  it paints overlays without modifying the text or links. Overlapping passages
  are painted once. Native mobile selection remains available.
- The selection button leaves 64px for the native touch-selection menu (8px on
  desktop), follows selection-handle adjustments and viewport movement, and
  falls below the visible passage when there isn't room above. Touch release
  also refreshes the selection so it doesn't depend on `selectionchange` alone.
- `GET /api/notes/highlights?noteId=…` returns public anchors, distinct reader
  counts, browser-specific ownership, and the text version. Responses are private
  and not cached. The client refreshes on focus and every minute while visible.
- `POST` adds a highlight; `DELETE` removes only the requesting browser's copy.
  Both accept `{noteId, version, anchor}` as JSON. A changed document returns 409.
  Duplicate submissions are idempotent; unpublished notes return 404.
- Anchors store the exact quote, 64 characters of context on each side, and text
  positions. Unique quotes and unambiguous context can reattach after minor edits.
  Changed or ambiguous quotes remain stored but are not displayed. Repeated
  quotes are never reattached based only on an old position.
- Text extraction mirrors the actual rendered text nodes, excluding image links
  rendered as images. Index positions are in normalized UTF-16 text.
- Postgres stores salted anonymous identities, never exposes them in responses,
  and enforces duplicate protection. Writes have shared per-browser and per-IP
  hourly rate limits. The application limits each reader to 50 passages per note
  and each note to 500 distinct active passages. Clearing cookies cannot bypass
  the IP rate limit. Request bodies are bounded at 8 KiB.

## Operations

Run `npm run migrate` before deploying the feature. The additive migration
`20260906_120000_add_note_highlights` creates `note_highlights` and
`note_highlight_rate_limits`; deleting a note cascades to its highlights.
To moderate a passage, an administrator can remove its rows in `note_highlights`
by the specific `note_id` and `anchor_key`. No public moderation endpoint exists.

`npm run test:highlights` runs anchor and storage tests against isolated in-memory
Postgres (PGlite), without accessing the portfolio database. Also run
`npm run build`. Browser checks should cover two anonymous sessions, selection
across inline links, save/reload, join/remove, mobile, and dark mode.
