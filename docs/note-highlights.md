# Public note highlights

Readers select 3–1,000 characters in a published note and choose **Highlight**.
Marks are public and visible by default; tapping one shows a text-only attribution
tooltip, dismissed by tapping outside or pressing Escape. A minimal switch beside “Highlights” in the activity popover
hides or shows the marks, without changing saved quotes or counts. Visibility is
remembered across notes and reloads in `gv-note-highlights-visible-v1` local storage.
The quote list and jump-to-passage actions still work when marks are hidden.
On phones, the highlights control opens a modal bottom sheet with a small spring
entrance. Swipe up to expand it, or down to dismiss it. The quote list scrolls
natively inside the sheet; a downward list gesture dismisses only when it starts
at the top. The handle also toggles expansion by tapping. Safe-area spacing,
reduced motion, focus containment, and background scroll locking are respected.
Desktop keeps the anchored popover. Selecting a quote closes either panel before
scrolling to the passage.
Text indexing ignores modal accessibility hiding on the article or its ancestors,
while still excluding hidden decorations inside the article. Opening the sheet or
refreshing highlights while it is open must not erase the visible marks.
Ownership uses the existing HTTP-only `gv_module_liker` cookie:
it is remembered in that browser, not synced between devices. No accounts, emails,
comments, or raw IP addresses are collected by this feature.

Tapping a saved passage shows “Highlighted by someone from [location] on [date and time]”
in the viewer's timezone, with no close or highlight buttons. Multiple people are
shown one at a time; a single right chevron cycles through every reader and loops
back to the first. Opening another passage resets to its first reader.
New saves retain coarse city/region/country labels from Vercel's edge headers;
there is no GPS request or external IP lookup. Old highlights retain their saved
dates and show no invented location. Repeated saves do not overwrite attribution.
The public API exposes only location/date records, never reader identifiers.
Activity shows those saved locations alongside highlight events, grouping readers
by location without attributing unknown readers to someone else's city. Highlight
excerpts use the same indented, left-bordered quote treatment as note bodies.

## Implementation

- The essay remains server-rendered. Highlighte.rs loads only when marks exist;
  it paints overlays without modifying the text or links. Overlapping passages
  are painted once. Native mobile selection remains available.
- The selection button sits 8px above the selected text on mobile and desktop,
  follows selection-handle adjustments and viewport movement, and
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
Apply `20260906_180000_add_highlight_locations` before deploying attribution support;
it adds one nullable location column without modifying historical timestamps.
To moderate a passage, an administrator can remove its rows in `note_highlights`
by the specific `note_id` and `anchor_key`. No public moderation endpoint exists.

`npm run test:highlights` runs anchor and storage tests against isolated in-memory
Postgres (PGlite), without accessing the portfolio database. Also run
`npm run build` and `npm run test:highlight-attribution`. Browser checks should cover two anonymous sessions, selection
across inline links, save/reload, join/remove, mobile, and dark mode.
`npm run test:bottom-sheet` checks swipe thresholds; browser checks should also
cover touch expansion/dismissal, long-list scrolling, and quote navigation.
