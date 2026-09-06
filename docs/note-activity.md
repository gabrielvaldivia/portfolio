# Note activity pill

Public note pages show one bottom-centered pill, sticky 24px above the bottom
safe area while reading. It lives in a natural footer slot 48px after the essay
body: when that slot reaches the pill, it docks there and scrolls away before
the recommendations and site footer. Native CSS sticky positioning keeps the
same controls mounted without scroll listeners or duplicated counters. The
essay retains its 760px reading width; the pill is centered in the full page
container on desktop as well as mobile.

The chronological `/activity` view includes saved highlights alongside likes and
chats. Each distinct passage shows the note title, a quote preview, a reader count
when more than one reader highlighted it, and the latest highlight date. Entries
link to the note. Existing highlights are included automatically; removing the
last reader's highlight removes the entry. Unpublished notes and quotes that no
longer resolve in the published body are omitted. Reader identities and full note
bodies are never returned by the activity API. The image-only Feed view is unchanged.
Run `npm run test:highlight-activity` for isolated query and pagination checks.

- Likes use the existing module-like target, counters, super likes, and activity events.
- The highlight count is the number of distinct, currently resolvable passages,
  not the number of readers. The popover lists every quote in document order;
  selecting one jumps to its first line. Existing selection/highlight actions remain.
  A switch beside the popover title shows/hides marks and remembers the reader's
  preference across notes. It does not delete highlights or hide the quote list.
  The borderless popover opens with neutral focus on its container, not an outlined
  control. Keyboard users can Tab into the switch and quote list with visible focus.
- Views begin at launch. A browser counts once per note per UTC calendar day.
  Only visible, mounted note pages record views, not server renders or prefetches.
  Unavailable counts display a dash, never a fabricated zero.

`GET /api/notes/views?noteId=…` reads the count without incrementing it.
`POST` records a view and returns `{ count }`. Only published notes are accepted.
Responses are private/no-store. Cross-site mutations are rejected. The existing
Postgres rate limiter uses separate `views:` keys (120 requests/hour per browser
and IP); it never stores raw IP addresses. `note_views` stores only the note ID,
the existing salted anonymous browser hash, and UTC date. Its primary key makes
concurrent requests/retries idempotent. Clearing cookies or using another browser
can count as another browser; this is a view metric, not a verified unique-person count.

Apply `20260906_160000_add_note_views` before deploying the new API.
The migration is additive and does not edit notes or their publication dates.
Run `npm run test:views` and `npm run test:highlights` for isolated Postgres tests.
