# Public note highlights

Readers select 3–1,000 characters in a published note and choose **Highlight**.
Marks are public and visible by default. Your own passages have a yellow fill;
other readers' passages have a dotted yellow underline. Hovering either style
replaces the passage's underline with a full yellow highlight and shows an attribution toast in the bottom-right
corner; moving away restores the saved style while leaving the toast available.
The toast replaces the previous passage's details and dismisses after eight
seconds, pausing while hovered, using its reader controls, or removing a highlight.
Readers can also close or swipe it away. On phones it sits above the note controls.
Jumping to another reader's quote uses underline emphasis. Your fill takes
priority wherever saved passages overlap. Tapping either style shows the same
attribution toast. Selecting text keeps the anchored **Highlight** button.
Independent “You” and
“Them” controls beside “Highlights” show or hide each group's document marks and
quotes. Open/closed eye icons indicate visibility; counts always show each group's
saved passage total. A passage saved by both you and someone else counts in both
groups but appears once in the list. With “You” off, shared passages retain the
other readers' dotted underline. Hidden passages do not respond to hover or taps.
Visibility is remembered across notes, reloads, and tabs in
`gv-note-highlights-visible-v2` local storage. The old single-switch preference is
used for both groups until the reader changes either control. Hiding highlights
does not remove any saved passages. When both groups are hidden, “Show all
highlights” restores the list and marks.
On phones, the highlights control opens a modal bottom sheet with a small spring
entrance. Swipe up to expand it, or down to dismiss it. The quote list scrolls
natively inside the sheet; a downward list gesture dismisses only when it starts
at the top. The handle also toggles expansion by tapping. Safe-area spacing,
reduced motion, focus containment, and background scroll locking are respected.
Desktop keeps the anchored popover at its current height while visibility is
toggled; longer contents scroll within it. Selecting a quote closes either panel before
scrolling to the passage.
Text indexing ignores modal accessibility hiding on the article or its ancestors,
while still excluding hidden decorations inside the article. Opening the sheet or
refreshing highlights while it is open must not erase the visible marks.
Ownership uses the existing HTTP-only `gv_module_liker` cookie:
it is remembered in that browser, not synced between devices. No accounts, emails,
comments, or raw IP addresses are collected by this feature.

Tapping a saved passage shows “Highlighted by someone from [location] on [date and time]”
in the viewer's timezone. Your own attribution includes **Remove**. Multiple people are
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
  of the same style are painted once. Underlines follow wrapped lines and reflow
  on resize and font loading. Native mobile selection remains available.
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
  hourly rate limits (120 mutation requests per hour per browser and IP). Each
  browser can save at most **5 passages covering 15% of a note**; overlapping text
  counts once. Each note is limited to 500 distinct active passages. Checks use
  the current normalized note text and resolved anchors. A transaction locks the
  note row before checking quotas or changing highlights, so concurrent requests
  cannot bypass these limits or race moderation. Clearing cookies cannot bypass
  the IP rate limit, but can reset browser ownership, quotas and browser blocks.
  Anonymous identities are not proof of a unique person. Request bodies are
  bounded at 8 KiB. Existing over-quota highlights are preserved; removal and
  idempotent retries remain available. Pausing never hides existing marks.

## Operations

Run `npm run migrate` before deploying the feature. The additive migration
`20260906_120000_add_note_highlights` creates `note_highlights` and
`note_highlight_rate_limits`; deleting a note cascades to its highlights.
Apply `20260906_180000_add_highlight_locations` before deploying attribution support;
it adds one nullable location column without modifying historical timestamps.
Apply `20260907_120000_add_highlight_moderation` before deploying these controls.
It adds note-scoped pause settings and browser blocks, without changing or
deleting existing highlights. Do not run migrations against the live database
as part of local tests.

In the note editor, open the **more menu → Highlights**:

- **Pause new highlights** immediately prevents new contributions on that note.
  Existing highlights remain visible, and readers can still remove their own.
- **Remove passage** deletes every reader's contribution to that passage,
  including old anchors that now resolve to it. Its Activity entry disappears.
- Expand a passage's readers to **Remove reader’s highlights** or **Remove and
  block**. Both remove only that browser's contributions on this note, retaining
  other readers' highlights. Blocking additionally prevents new saves from that
  browser on this note. Browser identities and blocks are not site-wide bans.
- **Unblock** allows future highlights again; it does not restore deleted ones.

Destructive actions require confirmation and cannot be undone. Moderation takes
effect immediately, independently of saving/publishing the note or its drafts.
Activity is derived from the remaining highlight rows, so deleted contributions
disappear on the next activity refresh. Open note pages refresh on focus and
every minute; new writes are checked immediately on the server.

`GET/POST /api/notes/highlights/moderation` requires an authenticated Payload
`users` account. Mutations also require a same-origin request. Only this private,
uncached admin endpoint includes opaque browser identifiers. The public API
never exposes identifiers and still deletes only the requesting browser's copy.
The public response's `paused` flag disables the selection button when paused.

`npm run test:highlights` runs anchor and storage tests against isolated in-memory
Postgres (PGlite), without accessing the portfolio database. Also run
`node --import tsx --test tests/note-highlight-moderation.test.ts` for quota
boundaries, overlapping selections, concurrency, legacy data, pause/block/removal,
Activity cleanup, authentication guards and request validation. No live data is
modified by these tests. Also run
`npm run build` and `npm run test:highlight-attribution`. Browser checks should cover two anonymous sessions, selection
across inline links, save/reload, join/remove, mobile, and dark mode.
`npm run test:bottom-sheet` checks swipe thresholds; browser checks should also
cover touch expansion/dismissal, long-list scrolling, and quote navigation.
